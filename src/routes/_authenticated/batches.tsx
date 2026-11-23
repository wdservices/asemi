/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMyCompany, type Company } from "@/lib/auth";
import {
  formatMoney,
  getBatch,
  listBatchCodeStrings,
  listBatches,
  listCodes,
  listProducts,
  fnCalculatePrice,
  fnInitializeBatchPayment,
  fnVerifyPaystackTransaction,
  fnResumeBatchGeneration,
  setBatchRecall,
  type Batch,
  type Code,
} from "@/lib/db";
import { mirrorPrice, isMissingFunctionError } from "@/lib/server-pricing";
import { generateQrDataUrl, downloadDataUrl } from "@/lib/qr";
import { downloadTagsZip, printTagSheet } from "@/lib/tag-exporter";
import { PageHeader, EmptyState, StatCard, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileCode,
  Download,
  Printer,
  CheckCircle2,
  QrCode,
  Search,
  AlertTriangle,
  Flag,
  LayoutGrid,
  List,
  Archive,
  ArrowRight,
  History,
  Loader2,
  RefreshCw,
  ShieldAlert,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { ProductTagPreview } from "@/components/asemi/ProductTagPreview";
import { TagPreviewModal } from "@/components/asemi/TagPreviewModal";

export const Route = createFileRoute("/_authenticated/batches")({
  head: () => ({ meta: [{ title: "Batches & Codes — Asemi" }] }),
  validateSearch: (search: Record<string, unknown>): { reference?: string | undefined } => ({
    reference: typeof search["reference"] === "string" ? search["reference"] : undefined,
  }),
  component: BatchesPage,
});

type CodeWithExtras = Code & {
  productName: string;
  productSku: string;
  batchNumber: string;
};

const QUERY_OPTS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

function useDebouncedValue<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function isExpiredDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return false;
  const endOfDay = new Date(parsed);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime() < Date.now();
}

function BatchesPage() {
  const [activeTab, setActiveTab] = useState("request");
  const search = Route.useSearch();
  const navigate = useNavigate();
  const reference = search.reference;

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Batches & Codes"
        description="Issue serialized per-unit authentication codes, record lot provenance, and export print-ready 28×32mm stickers."
      />

      {reference ? (
        <PaymentReturnHandler
          reference={reference}
          onClear={() => navigate({ to: "/batches", search: {}, replace: true })}
          onViewCodes={() => {
            navigate({ to: "/batches", search: {}, replace: true });
            setActiveTab("bank");
          }}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid h-auto w-full max-w-xl grid-cols-3 gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1">
            <TabsTrigger
              value="request"
              className="gap-2 rounded-md py-2 font-sans text-zinc-600 shadow-none data-[state=active]:bg-[#1a1a1e] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              <FileCode className="size-4" /> New batch
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="gap-2 rounded-md py-2 font-sans text-zinc-600 shadow-none data-[state=active]:bg-[#1a1a1e] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              <History className="size-4" /> History
            </TabsTrigger>
            <TabsTrigger
              value="bank"
              className="gap-2 rounded-md py-2 font-sans text-zinc-600 shadow-none data-[state=active]:bg-[#1a1a1e] data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              <QrCode className="size-4" /> Codes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="request" className="pt-6">
            <RequestBatchTab />
          </TabsContent>
          <TabsContent value="history" className="pt-6">
            <BatchHistoryTab />
          </TabsContent>
          <TabsContent value="bank" className="pt-6">
            <CodeBankTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                     PAYSTACK RETURN HANDLER (?reference=)                  */
/* -------------------------------------------------------------------------- */

function PaymentReturnHandler({
  reference,
  onClear,
  onViewCodes,
}: {
  reference: string;
  onClear: () => void;
  onViewCodes: () => void;
}) {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyName = company?.name || "Asemi Brand";
  const queryClient = useQueryClient();
  const [batchId, setBatchId] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(true);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fnVerifyPaystackTransaction(reference);
        if (!cancelled) setBatchId(res.batchId);
      } catch (err) {
        if (!cancelled) {
          setVerifyError(err instanceof Error ? err.message : "Payment verification failed.");
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const batch = useQuery({
    queryKey: ["batch-status", batchId],
    enabled: !!batchId,
    refetchInterval: (q) => {
      const s = (q.state.data as { status?: string } | undefined)?.status;
      return s === "ready" || s === "failed" ? false : 3000;
    },
    queryFn: () => getBatch(batchId!),
  });

  const codes = useQuery({
    queryKey: ["batch-codes-ready", batchId],
    enabled: batch.data?.status === "ready",
    ...QUERY_OPTS,
    queryFn: () => listBatchCodeStrings(batchId!),
  });

  const products = useQuery({
    queryKey: ["products", company?.id],
    enabled: !!company?.id,
    ...QUERY_OPTS,
    queryFn: () => listProducts(company!.id!),
  });

  const productLogo =
    products.data?.find((p: any) => p.id === batch.data?.productId)?.imageUrls?.[0] ??
    company?.logoUrl ??
    undefined;

  useEffect(() => {
    if (batch.data?.status === "ready") {
      queryClient.invalidateQueries({ queryKey: ["batches"] });
      queryClient.invalidateQueries({ queryKey: ["codes-bank"] });
      queryClient.invalidateQueries({ queryKey: ["company-stats"] });
    }
  }, [batch.data?.status, queryClient]);

  async function handleResume() {
    if (!batchId) return;
    setResuming(true);
    try {
      await fnResumeBatchGeneration(batchId);
      await batch.refetch();
      toast.success("Generation resumed.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resume failed");
    } finally {
      setResuming(false);
    }
  }

  if (verifying) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
        <Loader2 className="size-8 animate-spin text-zinc-600" />
        <p className="mt-4 font-sans text-lg font-bold text-zinc-900">Confirming your payment…</p>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          Reference <span className="font-mono text-xs">{reference}</span>
        </p>
      </div>
    );
  }

  if (verifyError || !batchId) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <p className="font-sans text-lg font-bold text-zinc-900">Couldn't confirm payment</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">{verifyError}</p>
        <p className="mx-auto mt-1 max-w-xl text-xs text-zinc-400">
          If you already paid, the confirmation webhook may still land — check Batch history in a
          minute.
        </p>
        <Button variant="outline" className="mt-4" onClick={onClear}>
          Back to batches
        </Button>
      </div>
    );
  }

  const b = batch.data;
  const status = b?.status;

  if (!b || status === "awaiting_payment" || status === "generating") {
    const pct = Math.round((b?.generationProgress ?? 0) * 100);
    return (
      <div className="flex flex-col items-center rounded-xl border border-zinc-200 bg-white p-12 text-center shadow-sm">
        <Loader2 className="size-8 animate-spin text-zinc-600" />
        <p className="mt-4 font-sans text-lg font-bold text-zinc-900">
          Payment confirmed — generating serialized codes…
        </p>
        <p className="mt-1 max-w-sm text-sm text-zinc-500">
          {b?.batchNumber ? (
            <>
              Batch <span className="font-mono font-semibold">{b.batchNumber}</span>
            </>
          ) : (
            "Assigning your batch number…"
          )}{" "}
          {status === "generating" && `· ${pct}%`}
        </p>
        <div className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-zinc-100">
          <div className="h-full bg-[#356fd6] transition-all" style={{ width: `${pct}%` }} />
        </div>
        <Button variant="ghost" className="mt-4 text-xs text-zinc-800" onClick={onClear}>
          Continue in background →
        </Button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="font-sans text-lg font-bold text-zinc-900">Generation hit a snag</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">
          Your payment for batch <span className="font-mono">{b.batchNumber ?? batchId}</span> is
          safe — no new charge. Resume to finish generating the codes you already paid for.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button
            className="bg-[#356fd6] hover:bg-[#285fbd]"
            disabled={resuming}
            onClick={handleResume}
          >
            {resuming ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Resuming…
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 size-4" /> Resume generation
              </>
            )}
          </Button>
          <Button variant="outline" onClick={onClear}>
            Back to batches
          </Button>
        </div>
      </div>
    );
  }

  const codeList = codes.data ?? [];
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 shadow-sm">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="mt-4 font-sans text-2xl font-bold tracking-tight">
          Batch {b.batchNumber ?? ""} ready
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {b.quantity.toLocaleString()} serialized unit codes created for{" "}
          <span className="font-semibold text-zinc-900">{b.productName}</span>.
        </p>

        {codes.isPending ? (
          <div className="mt-6 h-10 w-full animate-pulse rounded-xl bg-zinc-100" />
        ) : (
          <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
            <Button className="bg-[#356fd6] hover:bg-[#285fbd]" onClick={onViewCodes}>
              <QrCode className="size-4" /> View codes <ArrowRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadTagsZip({
                  batchNumber: b.batchNumber ?? batchId,
                  productName: b.productName || "Product",
                  brandName: companyName,
                  ...(productLogo ? { logoUrl: productLogo } : {}),
                  codes: codeList,
                  style: b.tagFormat || "rectangle",
                })
              }
            >
              <Archive className="size-4" /> Download labels (ZIP)
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                printTagSheet({
                  batchNumber: b.batchNumber ?? batchId,
                  productName: b.productName || "Product",
                  brandName: companyName,
                  ...(productLogo ? { logoUrl: productLogo } : {}),
                  codes: codeList,
                  style: b.tagFormat || "rectangle",
                })
              }
            >
              <Printer className="size-4" /> Print sheet
            </Button>
            <Button
              variant="outline"
              onClick={() => exportCsvForBatch(batchId, b.batchNumber ?? batchId, b.quantity)}
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </div>
        )}

        <Button variant="ghost" className="mt-4 text-xs text-zinc-800" onClick={onClear}>
          Request another batch →
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              REQUEST BATCH TAB                             */
/* -------------------------------------------------------------------------- */

function RequestBatchTab() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;
  const companyName = company?.name || "Asemi Brand";

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(100);
  const [sku, setSku] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const products = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: () => listProducts(companyId!),
  });

  useEffect(() => {
    if (!productId && products.data?.length) {
      setProductId(products.data[0]!.id);
    }
  }, [productId, products.data]);

  const selectedProduct = products.data?.find((p: any) => p.id === productId);

  // Sync default SKU and lot/mfg/expiry dates whenever the selected product changes
  useEffect(() => {
    if (!selectedProduct) return;
    setSku(selectedProduct.sku ?? "");
    setLotNumber(selectedProduct.lotNumber ?? "");
    setMfgDate(selectedProduct.mfgDate ?? "");
    setExpiryDate(selectedProduct.expiryDate ?? "");
  }, [selectedProduct?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const qty = Math.max(0, quantity | 0);
  const debouncedQty = useDebouncedValue(qty, 500);

  const quote = useQuery({
    queryKey: ["price-quote", companyId, debouncedQty],
    enabled: !!companyId && debouncedQty > 0,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      try {
        const r = await fnCalculatePrice(debouncedQty);
        return { ...r, source: "server" as const };
      } catch (err) {
        if (!isMissingFunctionError(err)) throw err;
        return {
          ...mirrorPrice(
            debouncedQty,
            company?.countryCode || "NG",
            company?.totalCodesGenerated ?? 0,
            company?.freeCodesUsed ?? 0,
          ),
          source: "local" as const,
        };
      }
    },
  });

  const q = quote.data;
  const freeRemain = Math.max(0, 20 - (company?.freeCodesUsed ?? 0));
  const invalidDateRange = Boolean(mfgDate && expiryDate && expiryDate < mfgDate);

  async function handleConfirm() {
    if (!companyId || !productId || !selectedProduct || qty <= 0 || !q || q.requiresQuote) return;
    if (invalidDateRange) {
      setError("Expiry date cannot precede the manufacture date.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const init = await fnInitializeBatchPayment({
        productId,
        quantity: qty,
        tagFormat: "rectangle",
        sku: sku.trim() || null,
        lotNumber: lotNumber.trim() || null,
        mfgDate: mfgDate || null,
        expiryDate: expiryDate || null,
      });
      window.location.href = init.authorizationUrl;
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Could not start checkout.";
      const msg = isMissingFunctionError(err)
        ? "Payment server is not deployed yet. Run `firebase deploy --only functions` from the repo root, then retry."
        : raw;
      setError(msg);
      toast.error(msg);
      setBusy(false);
    }
  }

  if (products.isPending) {
    return <div className="h-96 animate-pulse rounded-xl bg-white shadow-sm" />;
  }

  if (!products.data?.length) {
    return (
      <EmptyState
        title="Add a product to your catalogue first"
        description="Register at least one SKU before issuing serialized authentication batches."
      />
    );
  }

  const canPay = !!productId && qty > 0 && !!q && !q.requiresQuote && !invalidDateRange && !busy;

  return (
    <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)]">
      {/* Form */}
      <div className="min-w-0 space-y-5 rounded-xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            Batch specification
          </p>
          <span className="text-xs font-medium text-zinc-800">Paystack hosted checkout</span>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rb-product">Product *</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger id="rb-product" className="font-sans">
              <SelectValue placeholder="Select a product…" />
            </SelectTrigger>
            <SelectContent className="font-sans">
              {products.data.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  <span>{p.name}</span>
                  {p.sku ? (
                    <span className="ml-2 font-mono text-xs text-zinc-400">· {p.sku}</span>
                  ) : null}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-zinc-500">
            {selectedProduct?.sku ? (
              <>
                SKU{" "}
                <span className="font-mono font-medium text-zinc-700">{selectedProduct.sku}</span>
                {" · "}
              </>
            ) : null}
            Every unit receives a unique serialized cryptographic code.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="rb-qty">Serialized unit count *</Label>
            <span className="text-xs font-medium text-zinc-500 tabular-nums">
              {freeRemain > 0 ? (
                <span className="text-emerald-700">
                  {freeRemain} of 20 complimentary tags available — applied automatically
                </span>
              ) : (
                "Volume tier pricing applies automatically"
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[50, 100, 500, 1000, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setQuantity(preset)}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium tabular-nums transition ${
                  quantity === preset
                    ? "border-[#1a1a1e] bg-[#1a1a1e] text-white"
                    : "border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100"
                }`}
              >
                {preset.toLocaleString()}
              </button>
            ))}
          </div>
          <Input
            id="rb-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
            className="font-sans tabular-nums"
          />
        </div>

        {/* Batch provenance: SKU, Lot #, Manufacture date, Expiry date */}
        <div className="min-w-0 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/70 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-700">
              SKU, provenance &amp; shelf life
            </p>
            <span className="text-[11px] text-zinc-500">
              Indexed per unit &amp; shown on certificates
            </span>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="rb-sku" className="text-xs">
                SKU
              </Label>
              <Input
                id="rb-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. BRS-0050"
                className="w-full min-w-0 bg-white font-mono text-xs"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="rb-lot" className="text-xs">
                Lot number
              </Label>
              <Input
                id="rb-lot"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g. LOT-2026-04A"
                className="w-full min-w-0 bg-white font-mono text-xs"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="rb-mfg" className="text-xs">
                Manufacture date
              </Label>
              <Input
                id="rb-mfg"
                type="date"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
                className="w-full min-w-0 bg-white text-xs tabular-nums"
              />
            </div>
            <div className="min-w-0 space-y-1.5">
              <Label htmlFor="rb-exp" className="text-xs">
                Expiry date
              </Label>
              <Input
                id="rb-exp"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full min-w-0 bg-white text-xs tabular-nums"
              />
            </div>
          </div>
          {invalidDateRange && (
            <p className="text-xs font-medium text-red-600">
              Expiry date must be on or after the manufacture date.
            </p>
          )}
        </div>

        {/* Label spec summary */}
        <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-500">
          <span className="font-semibold text-zinc-800">28×32mm serialized sticker:</span> Every
          unit ships print-ready with your product mark, unique QR code, and fallback serial.
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-900">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
          <div>
            <p className="text-sm text-zinc-500">
              Total:{" "}
              <strong className="text-zinc-900 tabular-nums">
                {q ? formatMoney(q.price, q.currency) : "…"}
              </strong>{" "}
              <span className="text-xs tabular-nums">for {qty.toLocaleString()} codes</span>
            </p>
            <p className="mt-0.5 text-xs text-zinc-400">
              Codes mint immediately after Paystack confirmation.
            </p>
          </div>
          <Button
            onClick={handleConfirm}
            disabled={!canPay}
            className="whitespace-nowrap bg-[#356fd6] hover:bg-[#285fbd]"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Starting checkout…
              </>
            ) : (
              <>
                <FileCode className="size-4" /> Confirm &amp; pay with Paystack
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Server pricing summary */}
      <div className="min-w-0 space-y-4 overflow-hidden rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
            {q?.source === "local" ? "Estimated price" : "Server price"}
          </p>
          {q && q.source === "local" && (
            <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
              Live server price unreachable — local estimate shown. Final charge is calculated
              server-side at checkout.
            </p>
          )}
          {quote.isPending || !q ? (
            <div className="mt-2 h-11 w-48 animate-pulse rounded-lg bg-zinc-100" />
          ) : quote.isError ? (
            <div className="mt-2 text-sm">
              <p className="font-medium text-red-700">Couldn't fetch price</p>
              <Button variant="ghost" size="sm" onClick={() => quote.refetch()}>
                Retry
              </Button>
            </div>
          ) : q.requiresQuote ? (
            <p className="mt-2 text-sm font-medium text-zinc-700">
              Volume exceeds 1,000,000 lifetime codes — contact sales for a custom quote.
            </p>
          ) : (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="max-w-full break-words font-sans text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                  {formatMoney(q.price, q.currency)}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 tabular-nums">
                {(q.price / Math.max(1, q.paid)).toFixed(2)} {q.currency} per paid code
                {q.free > 0 && ` · ${q.free} free applied`} · Print labels included
              </p>
            </>
          )}
        </div>

        {(() => {
          if (!q || q.requiresQuote || q.breakdown.length === 0) return null;
          const cur = q.currency;
          return (
            <div className="space-y-1.5 rounded-xl bg-zinc-50 p-3 text-xs">
              {q.breakdown.map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate text-zinc-500">{row.label}</span>
                  <span className="shrink-0 font-mono font-medium tabular-nums">
                    {formatMoney(row.subtotal, cur)}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-800">
            Live label preview
          </p>
          <p className="text-[11px] text-zinc-500">
            28×32mm serialized packaging label for {selectedProduct?.name || companyName}.
          </p>
          <div className="flex justify-center py-3">
            <ProductTagPreview
              codeString="ASM-SAMPLE-CODE"
              productName={selectedProduct?.name || companyName}
              brandName={companyName}
              batchNumber="SAMPLE"
              {...((selectedProduct?.imageUrls?.[0] ?? company?.logoUrl)
                ? { logoUrl: (selectedProduct?.imageUrls?.[0] ?? company?.logoUrl) as string }
                : {})}
              showActions={false}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            BATCH HISTORY TAB                               */
/* -------------------------------------------------------------------------- */

function batchUiStatus(status: string): string {
  if (status === "ready") return "approved";
  if (status === "exported") return "reviewed";
  if (status === "failed") return "escalated";
  return status;
}

function BatchHistoryTab() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;
  const companyName = company?.name || "Asemi Brand";
  const queryClient = useQueryClient();
  const [resumingId, setResumingId] = useState<string | null>(null);

  const batches = useQuery({
    queryKey: ["batches", companyId],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: () => listBatches(companyId!),
  });

  const products = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: () => listProducts(companyId!),
  });

  const skuByProductId = useMemo(
    () => new Map((products.data ?? []).map((p) => [p.id, p.sku])),
    [products.data],
  );

  function logoForBatch(b: { productId?: string }): string | undefined {
    return (
      products.data?.find((p: any) => p.id === b.productId)?.imageUrls?.[0] ??
      company?.logoUrl ??
      undefined
    );
  }

  function logoForBatchId(batchId: string): string | undefined {
    const b = batches.data?.find((x: any) => x.id === batchId);
    return b ? logoForBatch(b) : (company?.logoUrl ?? undefined);
  }

  const [selectedBatchForTags, setSelectedBatchForTags] = useState<{
    id: string;
    batchNumber: string;
    productName: string;
    quantity: number;
    tagFormat?: "circle" | "rectangle";
  } | null>(null);

  const [recallTarget, setRecallTarget] = useState<Batch | null>(null);
  const [recallReason, setRecallReason] = useState("");
  const [recallBusy, setRecallBusy] = useState(false);

  function openRecallDialog(b: Batch) {
    setRecallTarget(b);
    setRecallReason(b.recallReason ?? "");
  }

  async function handleRecallSubmit(recalled: boolean) {
    if (!recallTarget || !companyId) return;
    setRecallBusy(true);
    try {
      await setBatchRecall({
        batchId: recallTarget.id,
        companyId,
        productId: recallTarget.productId,
        recalled,
        reason: recalled ? recallReason : null,
        batch: recallTarget,
      });
      await queryClient.invalidateQueries({ queryKey: ["batches", companyId] });
      toast.success(
        recalled
          ? `Batch ${recallTarget.batchNumber ?? ""} marked as recalled.`
          : `Recall lifted for ${recallTarget.batchNumber ?? "batch"}.`,
      );
      setRecallTarget(null);
      setRecallReason("");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to update recall state");
    } finally {
      setRecallBusy(false);
    }
  }

  async function handleBatchTagsZip(batchId: string, batchNumber: string, productName: string) {
    try {
      const loadId = toast.loading(`Preparing labels for ${batchNumber}…`);
      const codeStrings = await listBatchCodeStrings(batchId);
      const logoUrl = logoForBatchId(batchId);
      await downloadTagsZip({
        batchNumber,
        productName,
        brandName: companyName,
        ...(logoUrl ? { logoUrl } : {}),
        codes: codeStrings,
        style: "rectangle",
        onProgress: (cur, tot) => {
          toast.loading(`Exporting (${cur}/${tot})…`, { id: loadId });
        },
      });
      toast.success(`Downloaded labels for ${batchNumber}`, { id: loadId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate labels");
    }
  }

  async function handleBatchPrintSheet(batchId: string, batchNumber: string, productName: string) {
    try {
      toast.loading("Generating print sheet…", { id: "print-sheet" });
      const codeStrings = await listBatchCodeStrings(batchId);
      const logoUrl = logoForBatchId(batchId);
      await printTagSheet({
        batchNumber,
        productName,
        brandName: companyName,
        ...(logoUrl ? { logoUrl } : {}),
        codes: codeStrings,
        style: "rectangle",
      });
      toast.success("Print sheet ready!", { id: "print-sheet" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to open print sheet", { id: "print-sheet" });
    }
  }

  async function handleResume(batchId: string) {
    setResumingId(batchId);
    try {
      await fnResumeBatchGeneration(batchId);
      await queryClient.invalidateQueries({ queryKey: ["batches", companyId] });
      toast.success("Generation resumed — codes will appear as they are created.");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Resume failed");
    } finally {
      setResumingId(null);
    }
  }

  if (batches.isPending) {
    return <div className="h-96 animate-pulse rounded-xl bg-white shadow-sm" />;
  }
  if (!batches.data?.length) {
    return (
      <EmptyState
        title="No batches yet"
        description="Request your first batch from the New batch tab."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Batches" value={batches.data.length.toLocaleString()} />
        <StatCard
          label="Total codes"
          value={batches.data.reduce((s, b) => s + b.quantity, 0).toLocaleString()}
        />
        <StatCard
          label="Total spent"
          value={formatMoney(
            batches.data
              .filter((b) => b.status !== "awaiting_payment")
              .reduce((s, b) => s + (b.amountCharged ?? 0), 0),
            batches.data[0]?.currency ?? "USD",
          )}
        />
        <StatCard
          label="Last batch"
          value={batches.data[0] ? new Date(batches.data[0].createdAt).toLocaleDateString() : "—"}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Product &amp; provenance</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Charged</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.data.map((b) => {
                const sku = b.sku || skuByProductId.get(b.productId);
                const expired = isExpiredDate(b.expiryDate);
                return (
                  <TableRow key={b.id} className="hover:bg-zinc-50/60">
                    <TableCell className="font-mono text-xs font-semibold text-zinc-800">
                      {b.batchNumber ?? <span className="text-zinc-400">pending…</span>}
                    </TableCell>
                    <TableCell className="max-w-64">
                      <p className="truncate font-medium text-zinc-900">{b.productName ?? "—"}</p>
                      {(sku || b.lotNumber || b.mfgDate || b.expiryDate) && (
                        <p className="mt-0.5 truncate text-[11px] text-zinc-500 tabular-nums">
                          {[
                            sku ? `SKU ${sku}` : null,
                            b.lotNumber ? `Lot ${b.lotNumber}` : null,
                            b.mfgDate ? `Mfg ${new Date(b.mfgDate).toLocaleDateString()}` : null,
                            b.expiryDate
                              ? `Exp ${new Date(b.expiryDate).toLocaleDateString()}`
                              : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {b.quantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(b.amountCharged ?? 0, b.currency)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs text-zinc-400 tabular-nums">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {b.recalled ? (
                          <StatusBadge status="escalated" />
                        ) : (
                          <StatusBadge status={batchUiStatus(b.status)} />
                        )}
                        {b.recalled && (
                          <span className="text-[11px] font-semibold text-red-700">Recalled</span>
                        )}
                        {!b.recalled && expired && (
                          <span className="text-[11px] font-medium text-red-600">Expired</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {b.status === "awaiting_payment" ? (
                        b.paystackAuthorizationUrl ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 whitespace-nowrap border-zinc-300 text-xs text-zinc-800 hover:bg-zinc-100"
                            asChild
                          >
                            <a href={b.paystackAuthorizationUrl} target="_blank" rel="noreferrer">
                              Continue payment <ArrowRight className="size-3.5" />
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-zinc-400">Awaiting payment…</span>
                        )
                      ) : b.status === "failed" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 whitespace-nowrap border-zinc-300 text-xs text-zinc-800 hover:bg-zinc-100"
                          disabled={resumingId === b.id}
                          onClick={() => handleResume(b.id)}
                        >
                          {resumingId === b.id ? (
                            <>
                              <Loader2 className="mr-1 size-3.5 animate-spin" /> Resuming…
                            </>
                          ) : (
                            <>
                              <RefreshCw className="mr-1 size-3.5" /> Resume
                            </>
                          )}
                        </Button>
                      ) : b.status === "generating" ? (
                        <span className="text-xs text-zinc-400 tabular-nums">
                          Generating {Math.round((b.generationProgress ?? 0) * 100)}%…
                        </span>
                      ) : (
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setSelectedBatchForTags({
                                id: b.id,
                                batchNumber: b.batchNumber ?? b.id,
                                productName: b.productName || "Product",
                                quantity: b.quantity,
                                tagFormat: b.tagFormat || "rectangle",
                              })
                            }
                            className="h-8 whitespace-nowrap text-xs"
                          >
                            Labels
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              exportCsvForBatch(b.id, b.batchNumber ?? b.id, b.quantity)
                            }
                            className="h-8 whitespace-nowrap text-xs"
                          >
                            <Download className="size-3.5" /> CSV
                          </Button>
                          <Button
                            variant={b.recalled ? "outline" : "ghost"}
                            size="sm"
                            onClick={() => openRecallDialog(b)}
                            className={`h-8 whitespace-nowrap text-xs ${
                              b.recalled
                                ? "border-red-200 text-red-700 hover:bg-red-50"
                                : "text-zinc-500 hover:text-red-700"
                            }`}
                          >
                            {b.recalled ? (
                              <>
                                <RotateCcw className="mr-1 size-3.5" /> Manage recall
                              </>
                            ) : (
                              <>
                                <ShieldAlert className="mr-1 size-3.5" /> Recall
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {selectedBatchForTags && (
        <Dialog
          open={!!selectedBatchForTags}
          onOpenChange={(open) => !open && setSelectedBatchForTags(null)}
        >
          <DialogContent className="max-w-md font-sans">
            <DialogHeader>
              <DialogTitle>Labels for {selectedBatchForTags.batchNumber}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <p className="text-xs text-zinc-500">
                28×32mm serialized packaging stickers — download high-resolution labels (ZIP) or
                open a printable sheet.
              </p>
              <div className="flex items-center justify-between rounded-xl border border-zinc-200 p-3">
                <div>
                  <p className="text-sm font-semibold">Serialized labels</p>
                  <p className="text-xs text-zinc-500 tabular-nums">
                    {selectedBatchForTags.quantity.toLocaleString()} codes · 28×32mm
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      handleBatchPrintSheet(
                        selectedBatchForTags.id,
                        selectedBatchForTags.batchNumber,
                        selectedBatchForTags.productName,
                      )
                    }
                    className="h-8 text-xs"
                  >
                    <Printer className="mr-1 size-3.5" /> Print
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      handleBatchTagsZip(
                        selectedBatchForTags.id,
                        selectedBatchForTags.batchNumber,
                        selectedBatchForTags.productName,
                      )
                    }
                    className="h-8 bg-[#356fd6] text-xs hover:bg-[#285fbd]"
                  >
                    <Archive className="mr-1 size-3.5" /> ZIP
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {recallTarget && (
        <Dialog
          open={!!recallTarget}
          onOpenChange={(open) => !open && !recallBusy && setRecallTarget(null)}
        >
          <DialogContent className="max-w-md font-sans">
            <DialogHeader>
              <DialogTitle>
                {recallTarget.recalled
                  ? `Manage recall — ${recallTarget.batchNumber ?? "Batch"}`
                  : `Issue recall — ${recallTarget.batchNumber ?? "Batch"}`}
              </DialogTitle>
              <DialogDescription>
                {recallTarget.recalled
                  ? "Consumers scanning codes in this batch currently see an urgent recall notice. You can update the notice or restore the batch."
                  : "Immediately flags every code in this batch so consumers scanning packaging see an urgent safety/recall warning instead of a genuine clearance."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="batch-recall-reason">Consumer advisory message</Label>
                <Textarea
                  id="batch-recall-reason"
                  rows={3}
                  placeholder="e.g. Voluntary quality recall for Lot #42 — stop use and return to point of purchase."
                  value={recallReason}
                  onChange={(e) => setRecallReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              {recallTarget.recalled ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={recallBusy}
                  onClick={() => handleRecallSubmit(false)}
                >
                  <RotateCcw className="mr-1.5 size-4" /> Lift recall
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  disabled={recallBusy}
                  onClick={() => setRecallTarget(null)}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                variant="destructive"
                disabled={recallBusy}
                onClick={() => handleRecallSubmit(true)}
              >
                {recallBusy ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" /> Saving…
                  </>
                ) : recallTarget.recalled ? (
                  "Update recall notice"
                ) : (
                  "Confirm batch recall"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               CODE BANK TAB                                */
/* -------------------------------------------------------------------------- */

function CodeBankTab() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;
  const companyName = company?.name || "Asemi Security";

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [previewCode, setPreviewCode] = useState<CodeWithExtras | null>(null);

  const products = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: () => listProducts(companyId!),
  });

  const batches = useQuery({
    queryKey: ["batches", companyId],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: () => listBatches(companyId!, 200),
  });

  const visibleBatches = useMemo(() => {
    if (filterProduct === "all") return batches.data ?? [];
    return (batches.data ?? []).filter((b: any) => b.productId === filterProduct);
  }, [batches.data, filterProduct]);

  useEffect(() => {
    if (filterProduct !== "all" && filterBatch !== "all") {
      const stillValid = visibleBatches.some((b: any) => b.id === filterBatch);
      if (!stillValid) setFilterBatch("all");
    }
  }, [filterProduct, visibleBatches, filterBatch]);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const skuQueryParam =
    debouncedSearch.length >= 2 && !debouncedSearch.toUpperCase().startsWith("ASM")
      ? debouncedSearch
      : undefined;

  const codes = useQuery({
    queryKey: ["codes-bank", companyId, filterProduct, filterBatch, flaggedOnly, skuQueryParam],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: () =>
      listCodes(companyId!, {
        productId: filterProduct === "all" ? undefined : filterProduct,
        batchId: filterBatch === "all" ? undefined : filterBatch,
        sku: skuQueryParam,
        flaggedOnly: flaggedOnly || undefined,
        limitN: 200,
      }),
  });

  const codesWithExtras = useMemo<CodeWithExtras[]>(() => {
    const productMap = new Map((products.data ?? []).map((p) => [p.id, p]));
    const batchMap = new Map((batches.data ?? []).map((b) => [b.id, b]));
    return (codes.data ?? []).map((c) => {
      const prod = productMap.get(c.productId);
      const batch = batchMap.get(c.batchId);
      return {
        ...c,
        productName: prod?.name ?? "—",
        productSku: c.sku || batch?.sku || prod?.sku || "",
        batchNumber: batch?.batchNumber ?? "—",
      };
    });
  }, [codes.data, products.data, batches.data]);

  const searchClean = search
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const searchLower = search.trim().toLowerCase();
  const visibleCodes = useMemo(() => {
    if (!searchLower) return codesWithExtras;
    return codesWithExtras.filter(
      (c) =>
        (searchClean.length > 0 &&
          c.codeString
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .includes(searchClean)) ||
        c.productSku.toLowerCase().includes(searchLower) ||
        c.productName.toLowerCase().includes(searchLower),
    );
  }, [codesWithExtras, searchClean, searchLower]);

  function logoForCode(c: CodeWithExtras): string | undefined {
    return (
      products.data?.find((p: any) => p.id === c.productId)?.imageUrls?.[0] ??
      company?.logoUrl ??
      undefined
    );
  }

  const handleBulkZip = async () => {
    if (!visibleCodes.length) return;
    try {
      const loadId = toast.loading(`Exporting ${Math.min(visibleCodes.length, 100)} labels…`);
      const first = visibleCodes[0]!;
      const logoUrl = logoForCode(first);
      await downloadTagsZip({
        batchNumber: filterBatch !== "all" ? filterBatch : "selection",
        productName: first.productName || "Product",
        brandName: companyName,
        ...(logoUrl ? { logoUrl } : {}),
        codes: visibleCodes.slice(0, 100).map((c) => c.codeString),
        style: "rectangle",
        onProgress: (cur, tot) => {
          toast.loading(`Exporting (${cur}/${tot})…`, { id: loadId });
        },
      });
      toast.success("Downloaded labels", { id: loadId });
    } catch (err) {
      console.error(err);
      toast.error("Bulk export failed");
    }
  };

  const handleBulkPrint = async () => {
    if (!visibleCodes.length) return;
    try {
      toast.loading("Generating print sheet…", { id: "bulk-print" });
      const first = visibleCodes[0]!;
      const logoUrl = logoForCode(first);
      await printTagSheet({
        batchNumber: filterBatch !== "all" ? filterBatch : "bank",
        productName: first.productName || "Product",
        brandName: companyName,
        ...(logoUrl ? { logoUrl } : {}),
        codes: visibleCodes.slice(0, 100).map((c) => c.codeString),
        style: "rectangle",
      });
      toast.success("Print sheet ready!", { id: "bulk-print" });
    } catch (err) {
      console.error(err);
      toast.error("Print generation failed", { id: "bulk-print" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-bold text-zinc-900">Serialized Code Bank</h3>
          <p className="text-xs text-zinc-500">
            Every unit carries an individual verification code · 28×32mm print labels · showing up
            to 200 matching codes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "table" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"
              }`}
              title="Table view"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "cards" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400"
              }`}
              title="Card view"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="cb-prod">Product</Label>
            <Select value={filterProduct} onValueChange={setFilterProduct}>
              <SelectTrigger id="cb-prod" className="w-full font-sans">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="font-sans">
                <SelectItem value="all">All products</SelectItem>
                {products.data?.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-1.5">
            <Label htmlFor="cb-batch">Batch</Label>
            <Select
              value={filterBatch}
              onValueChange={setFilterBatch}
              disabled={visibleBatches.length === 0}
            >
              <SelectTrigger id="cb-batch" className="w-full font-sans">
                <SelectValue placeholder="All batches" />
              </SelectTrigger>
              <SelectContent className="font-sans">
                <SelectItem value="all">All batches</SelectItem>
                {visibleBatches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.batchNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-0 space-y-1.5 sm:col-span-2">
            <Label htmlFor="cb-search">Search code or SKU</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                id="cb-search"
                placeholder="ASM-XXXX-XXXXXX or SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 font-mono text-xs"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-3">
          <p className="text-xs text-zinc-500 tabular-nums">
            Showing{" "}
            <strong className="text-zinc-900">{visibleCodes.length.toLocaleString()}</strong>{" "}
            {visibleCodes.length === 1 ? "code" : "codes"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={flaggedOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setFlaggedOnly((f) => !f)}
              className={`whitespace-nowrap shrink-0 text-xs ${flaggedOnly ? "bg-red-600 hover:bg-red-700" : ""}`}
            >
              <Flag className="mr-1.5 size-3.5" />
              {flaggedOnly ? "Flagged only" : "All statuses"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkPrint}
              disabled={!visibleCodes.length}
              className="whitespace-nowrap shrink-0 text-xs"
            >
              <Printer className="mr-1.5 size-3.5" /> Print sheet
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkZip}
              disabled={!visibleCodes.length}
              className="whitespace-nowrap shrink-0 text-xs"
            >
              <Archive className="mr-1.5 size-3.5" /> Download ZIP
            </Button>
          </div>
        </div>
      </div>

      {/* Codes list */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        {codes.isPending ? (
          <div className="h-64 animate-pulse rounded-xl bg-zinc-50" />
        ) : !visibleCodes.length ? (
          <div className="p-8">
            <EmptyState
              title="No codes found"
              description="Try clearing filters, or request your first batch to generate codes."
            />
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <div className="mb-3 flex items-center justify-between text-xs text-zinc-500">
              <span>
                <strong className="text-zinc-900 tabular-nums">{visibleCodes.length}</strong> codes
              </span>
              <span>Click a QR thumbnail to download</span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">QR</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Scans</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCodes.map((c) => (
                  <TableRow key={c.id} className="hover:bg-zinc-50/60">
                    <TableCell>
                      <CodeQrThumbnail codeString={c.codeString} />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {c.codeString}
                      {c.flagged && <AlertTriangle className="ml-2 inline size-3.5 text-red-600" />}
                    </TableCell>
                    <TableCell className="max-w-44 truncate text-xs">
                      <span>{c.productName ?? "—"}</span>
                      {c.productSku ? (
                        <span className="ml-1.5 font-mono text-[11px] text-zinc-400">
                          · {c.productSku}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-zinc-500">
                      {c.batchNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {(c.scanCount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.flagged ? "escalated" : "approved"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPreviewCode(c)}
                        className="h-8 border-zinc-300 text-xs text-zinc-800 hover:bg-zinc-100"
                      >
                        Preview
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-zinc-500">
              Displaying <strong className="text-zinc-900">{visibleCodes.length}</strong> labels
            </p>
            <div className="grid place-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleCodes.slice(0, 48).map((c) => (
                <div
                  key={c.id}
                  className="flex w-full max-w-72 flex-col items-center rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-2 flex w-full items-center justify-between border-b border-zinc-100 pb-2 text-[11px] text-zinc-500">
                    <span className="max-w-32 truncate font-medium text-zinc-900">
                      {c.productName}
                    </span>
                    <span className="font-mono">{c.batchNumber}</span>
                  </div>
                  <ProductTagPreview
                    codeString={c.codeString}
                    productName={c.productName}
                    brandName={companyName}
                    batchNumber={c.batchNumber}
                    {...(logoForCode(c) ? { logoUrl: logoForCode(c) as string } : {})}
                    size="sm"
                    showActions={true}
                  />
                  <button
                    type="button"
                    onClick={() => setPreviewCode(c)}
                    className="mt-2 text-xs font-medium text-zinc-800 hover:underline"
                  >
                    Full preview
                  </button>
                </div>
              ))}
            </div>
            {visibleCodes.length > 48 && (
              <p className="text-center text-xs text-zinc-400">
                Showing first 48 labels — switch to table view or narrow filters to see more.
              </p>
            )}
          </div>
        )}
      </div>

      {previewCode && (
        <TagPreviewModal
          open={!!previewCode}
          onOpenChange={(open) => !open && setPreviewCode(null)}
          codeString={previewCode.codeString}
          productName={previewCode.productName}
          brandName={companyName}
          batchNumber={previewCode.batchNumber}
          {...(logoForCode(previewCode) ? { logoUrl: logoForCode(previewCode) as string } : {})}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               INLINE QR COMP                               */
/* -------------------------------------------------------------------------- */

function CodeQrThumbnail({ codeString }: { codeString: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    generateQrDataUrl(
      typeof window !== "undefined"
        ? `${window.location.origin}/v/${codeString}`
        : `https://asemi.io/v/${codeString}`,
      { width: 64, margin: 0 },
    ).then((url) => {
      if (active) setDataUrl(url);
    });
    return () => {
      active = false;
    };
  }, [codeString]);

  if (!dataUrl) {
    return <div className="size-8 animate-pulse rounded bg-zinc-100" />;
  }

  return (
    <button
      type="button"
      onClick={() => downloadDataUrl(dataUrl, `qr-${codeString}.png`)}
      className="size-8 overflow-hidden rounded-lg border border-zinc-200 p-0.5 transition hover:ring-2 hover:ring-zinc-400"
      title="Click to download QR code"
    >
      <img src={dataUrl} alt="QR" className="size-full object-contain" />
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 HELPERS                                    */
/* -------------------------------------------------------------------------- */

async function exportCsvForBatch(batchId: string, batchNumber: string, fallbackQty: number) {
  try {
    toast.loading(`Fetching ${fallbackQty.toLocaleString()} codes…`, { id: "csv" });
    const strings = await listBatchCodeStrings(batchId);

    const lines = ["code_string,verification_url"];
    for (const s of strings) {
      lines.push(`${s},${window.location.origin}/v/${s}`);
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asemi-${batchNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${strings.length.toLocaleString()} codes`, { id: "csv" });
  } catch (err) {
    console.error(err);
    toast.error(err instanceof Error ? err.message : "CSV export failed", { id: "csv" });
  }
}
