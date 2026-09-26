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
  type Code,
  } from "@/lib/db";
import { mirrorPrice, isMissingFunctionError } from "@/lib/server-pricing";
import {
  generateQrDataUrl,
  downloadDataUrl,
  generateBatchQrCode,
  type BatchProductInfo,
} from "@/lib/qr";
import { downloadTagsZip, printTagSheet } from "@/lib/tag-exporter";
import { PageHeader, EmptyState, StatCard, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { ProductTagPreview } from "@/components/asemi/ProductTagPreview";
import { TagPreviewModal } from "@/components/asemi/TagPreviewModal";
import { BatchQrModal } from "@/components/asemi/BatchQrModal";
import { BatchQrInlinePanel } from "@/components/asemi/BatchQrInlinePanel";

export const Route = createFileRoute("/_authenticated/batches")({
  head: () => ({ meta: [{ title: "Batches & Codes — Asemi" }] }),
  validateSearch: (search: Record<string, unknown>): { reference?: string | undefined } => ({
    reference: typeof search["reference"] === "string" ? search["reference"] : undefined,
  }),
  component: BatchesPage,
});

type CodeWithExtras = Code & {
  productName: string;
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

function BatchesPage() {
  const [activeTab, setActiveTab] = useState("request");
  const search = Route.useSearch();
  const navigate = useNavigate();
  const reference = search.reference;

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Batches & Codes"
        description="Make QR codes for your products in three steps: pick a product, choose how many codes you need, then pay. Your codes appear under History when ready."
      />

      {/* Simple 3-step guide */}
      <div className="grid gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-white p-4 sm:grid-cols-3">
        {[
          { n: "1", t: "Choose product", d: "Pick which product these codes will protect" },
          { n: "2", t: "Set quantity", d: "How many units you're packaging — priced live" },
          { n: "3", t: "Pay & generate", d: "Paystack checkout, then codes generate" },
        ].map((s) => (
          <div key={s.n} className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
              {s.n}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{s.t}</p>
              <p className="truncate text-xs text-slate-500">{s.d}</p>
            </div>
          </div>
        ))}
      </div>

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
          <TabsList className="grid w-full grid-cols-3 bg-slate-100">
            <TabsTrigger value="request" className="font-sans">
              <FileCode className="mr-2 size-4" /> New batch
            </TabsTrigger>
            <TabsTrigger value="history" className="font-sans">
              <History className="mr-2 size-4" /> History
            </TabsTrigger>
            <TabsTrigger value="bank" className="font-sans">
              <QrCode className="mr-2 size-4" /> Codes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="request" className="pt-4">
            <RequestBatchTab />
          </TabsContent>
          <TabsContent value="history" className="pt-4">
            <BatchHistoryTab />
          </TabsContent>
          <TabsContent value="bank" className="pt-4">
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
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <Loader2 className="size-8 animate-spin text-blue-600" />
        <p className="mt-4 font-sans text-lg font-bold text-slate-900">Confirming your payment…</p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Reference <span className="font-mono text-xs">{reference}</span>
        </p>
      </div>
    );
  }

  if (verifyError || !batchId) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="font-sans text-lg font-bold text-slate-900">Couldn't confirm payment</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{verifyError}</p>
        <p className="mx-auto mt-1 max-w-xl text-xs text-slate-400">
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
      <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <Loader2 className="size-8 animate-spin text-blue-600" />
        <p className="mt-4 font-sans text-lg font-bold text-slate-900">
          Payment confirmed — generating codes…
        </p>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          {b?.batchNumber ? (
            <>
              Batch <span className="font-mono font-semibold">{b.batchNumber}</span>
            </>
          ) : (
            "Assigning your batch number…"
          )}{" "}
          {status === "generating" && `· ${pct}%`}
        </p>
        <div className="mt-4 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
          <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <Button variant="ghost" className="mt-4 text-xs text-blue-700" onClick={onClear}>
          Continue in background →
        </Button>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <p className="font-sans text-lg font-bold text-slate-900">Generation hit a snag</p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          Your payment for batch <span className="font-mono">{b.batchNumber ?? batchId}</span> is
          safe — no new charge. Resume to finish generating the codes you already paid for.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Button
            className="bg-blue-600 hover:bg-blue-700"
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

  // status === "ready" (or exported)
  const codeList = codes.data ?? [];
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="mt-4 font-sans text-2xl font-bold tracking-tight">
          Batch {b.batchNumber ?? ""} ready
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {b.quantity.toLocaleString()} codes created for{" "}
          <span className="font-semibold text-slate-900">{b.productName}</span>.
        </p>

        {codes.isPending ? (
          <div className="mt-6 h-10 w-full animate-pulse rounded-xl bg-slate-100" />
        ) : (
          <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={onViewCodes}>
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

        <Button variant="ghost" className="mt-4 text-xs text-blue-700" onClick={onClear}>
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const products = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: () => listProducts(companyId!),
  });

  // Default to the first product so the live preview always carries a real
  // product name and logo instead of placeholder text.
  useEffect(() => {
    if (!productId && products.data?.length) {
      setProductId(products.data[0]!.id);
    }
  }, [productId, products.data]);

  const qty = Math.max(0, quantity | 0);
  const debouncedQty = useDebouncedValue(qty, 500);

  // Live price is always server-computed — never trust a client-side number.
  // If functions aren't deployed yet, fall back to a local mirror of the
  // server tables (clearly labeled) so the page stays usable; checkout still
  // re-prices server-side.
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

  const selectedProduct = products.data?.find((p: any) => p.id === productId);
  const q = quote.data;

  // 20 free codes per company from registration — remainder auto-applies.
  const freeRemain = Math.max(0, 20 - (company?.freeCodesUsed ?? 0));

  async function handleConfirm() {
    if (!companyId || !productId || !selectedProduct || qty <= 0 || !q || q.requiresQuote) return;
    setBusy(true);
    setError("");
    try {
      const init = await fnInitializeBatchPayment({
        productId,
        quantity: qty,
        tagFormat: "rectangle",
      });
      // Hand off to Paystack's hosted checkout. We return on /batches?reference=.
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
    return <div className="h-96 animate-pulse rounded-2xl bg-white shadow-sm" />;
  }

  if (!products.data?.length) {
    return (
      <EmptyState
        title="Create a product first"
        description="You need at least one product before you can request verification codes."
      />
    );
  }

  const canPay = !!productId && qty > 0 && !!q && !q.requiresQuote && !busy;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Form */}
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            New batch
          </p>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            Paystack checkout
          </span>
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
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-400">
            Which product will carry these codes? Each code verifies this product.
          </p>
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="rb-qty">Quantity *</Label>
            {freeRemain > 0 ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                🎁 {freeRemain} of 20 free codes left — applied automatically
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                Free codes used up — this batch is fully paid
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {[50, 100, 500, 1000, 5000].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setQuantity(preset)}
                className={`rounded-lg border px-2 py-0.5 text-xs font-medium transition ${
                  quantity === preset
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
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
            className="font-sans"
          />
          <p className="text-xs text-slate-400">
            How many units are you packaging? Every unit gets its own unique code. Min 1 code —
            volume discounts apply automatically.
          </p>
        </div>

        {/* Single label format — 28×32mm verification sticker */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Verification sticker · 28×32mm</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Every code ships print-ready on a plain white 28×32mm label with your product logo,
            product name, QR code, and code — designed for holographic sticker stock.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-900">
            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm text-slate-500">
              Total:{" "}
              <strong className="text-slate-900">
                {q ? formatMoney(q.price, q.currency) : "…"}
              </strong>{" "}
              <span className="text-xs">for {qty.toLocaleString()} codes</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              You'll be redirected to Paystack to pay securely. Codes generate automatically after
              payment — nothing is created until you pay.
            </p>
          </div>
          <Button
            onClick={handleConfirm}
            disabled={!canPay}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" /> Starting checkout…
              </>
            ) : (
              <>
                <FileCode className="size-4" /> Confirm and Pay with Paystack
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Server pricing summary */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            {q?.source === "local" ? "Estimated price" : "Server price"}
          </p>
          {q && q.source === "local" && (
            <p className="mt-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-900">
              Live server price unreachable (functions not deployed) — estimate shown. The final
              charge is always computed on the server at checkout.
            </p>
          )}
          {quote.isPending || !q ? (
            <div className="mt-2 h-11 w-48 animate-pulse rounded-lg bg-slate-100" />
          ) : quote.isError ? (
            <div className="mt-2 text-sm">
              <p className="font-medium text-red-700">Couldn't fetch price</p>
              <Button variant="ghost" size="sm" onClick={() => quote.refetch()}>
                Retry
              </Button>
            </div>
          ) : q.requiresQuote ? (
            <p className="mt-2 text-sm font-medium text-slate-700">
              Volume exceeds 1,000,000 lifetime codes — contact sales for a custom quote.
            </p>
          ) : (
            <>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-sans text-4xl font-bold tracking-tight">
                  {formatMoney(q.price, q.currency)}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {(q.price / Math.max(1, q.paid)).toFixed(2)} {q.currency} per paid code
                {q.free > 0 && ` · ${q.free} free applied`} · Labels included free
              </p>
              {q.free > 0 && (
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  Free codes in this batch: {q.free}
                </p>
              )}
            </>
          )}
        </div>

        {(() => {
          if (!q || q.requiresQuote || q.breakdown.length === 0) return null;
          const cur = q.currency;
          return (
            <div className="space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
              {q.breakdown.map((row, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <span className="truncate text-slate-500">{row.label}</span>
                  <span className="shrink-0 font-mono font-medium tabular-nums">
                    {formatMoney(row.subtotal, cur)}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">How it works</p>
          <p>1. Confirm — we hold the batch, no codes yet.</p>
          <p>2. Pay on Paystack's secure checkout.</p>
          <p>3. Codes generate automatically after payment.</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Live preview
          </p>
          <p className="text-[11px] text-slate-500">
            Exactly how the 28×32mm sticker will look when printed.
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

  const [historyBatchForQr, setHistoryBatchForQr] = useState<{
    batchId: string;
    productInfo: BatchProductInfo;
  } | null>(null);

  async function handleBatchTagsZip(
    batchId: string,
    batchNumber: string,
    productName: string,
  ) {
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

  async function handleBatchPrintSheet(
    batchId: string,
    batchNumber: string,
    productName: string,
  ) {
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
    return <div className="h-96 animate-pulse rounded-2xl bg-white shadow-sm" />;
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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Charged</TableHead>
                <TableHead className="text-right">Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.data.map((b) => (
                <TableRow key={b.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono text-xs font-semibold text-blue-700">
                    {b.batchNumber ?? (
                      <span className="text-slate-400">pending…</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-40 truncate">{b.productName ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {b.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(b.amountCharged ?? 0, b.currency)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-xs text-slate-400">
                    {new Date(b.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={batchUiStatus(b.status)} />
                  </TableCell>
                  <TableCell className="text-right">
                    {b.status === "awaiting_payment" ? (
                      b.paystackAuthorizationUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 border-blue-200 text-xs text-blue-700 hover:bg-blue-50"
                          asChild
                        >
                          <a
                            href={b.paystackAuthorizationUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Continue payment <ArrowRight className="size-3.5" />
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">Awaiting payment…</span>
                      )
                    ) : b.status === "failed" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border-blue-200 text-xs text-blue-700 hover:bg-blue-50"
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
                      <span className="text-xs text-slate-400">
                        Generating {Math.round((b.generationProgress ?? 0) * 100)}%…
                      </span>
                    ) : (
                    <div className="flex justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setHistoryBatchForQr({
                            batchId: b.id,
                            productInfo: {
                              productName: b.productName || "Product",
                              ...(b.batchNumber ? { batchNumber: b.batchNumber } : {}),
                              productId: b.productId,
                              quantity: b.quantity,
                              brandName: companyName,
                              tagFormat: b.tagFormat || "rectangle",
                            },
                          })
                        }
                        className="h-8 border-blue-200 text-xs text-blue-700 hover:bg-blue-50"
                        title="Batch QR code"
                      >
                        <QrCode className="size-3.5" /> QR
                      </Button>
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
                        className="h-8 text-xs"
                      >
                        Labels
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => exportCsvForBatch(b.id, b.batchNumber ?? b.id, b.quantity)}
                        className="h-8 text-xs"
                      >
                        <Download className="size-3.5" /> CSV
                      </Button>
                    </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
              <p className="text-xs text-slate-500">
                28×32mm verification stickers — download high-resolution labels (ZIP) or open a
                printable sheet.
              </p>
              <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                <div>
                  <p className="text-sm font-semibold">Verification labels</p>
                  <p className="text-xs text-slate-500">
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
                    className="h-8 bg-blue-600 text-xs hover:bg-blue-700"
                  >
                    <Archive className="mr-1 size-3.5" /> ZIP
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {historyBatchForQr && (
        <BatchQrModal
          open={!!historyBatchForQr}
          onOpenChange={(open) => !open && setHistoryBatchForQr(null)}
          batchId={historyBatchForQr.batchId}
          productInfo={historyBatchForQr.productInfo}
        />
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
  const [selectedBatchForQr, setSelectedBatchForQr] = useState<{
    batchId: string;
    productInfo: BatchProductInfo;
  } | null>(null);

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

  const codes = useQuery({
    queryKey: ["codes-bank", companyId, filterProduct, filterBatch, flaggedOnly],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: async (): Promise<CodeWithExtras[]> => {
      const list = await listCodes(companyId!, {
        productId: filterProduct === "all" ? undefined : filterProduct,
        batchId: filterBatch === "all" ? undefined : filterBatch,
        flaggedOnly: flaggedOnly || undefined,
        limitN: 200,
      });
      const productNames = new Map((products.data ?? []).map((p) => [p.id, p.name]));
      const batchNumbers = new Map((batches.data ?? []).map((b) => [b.id, b.batchNumber]));
      return list.map((c) => ({
        ...c,
        productName: productNames.get(c.productId) ?? "—",
        batchNumber: batchNumbers.get(c.batchId) ?? "—",
      }));
    },
  });

  const searchClean = search
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  const visibleCodes = useMemo(() => {
    if (!searchClean) return codes.data ?? [];
    return (codes.data ?? []).filter((c) =>
      c.codeString
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .includes(searchClean),
    );
  }, [codes.data, searchClean]);

  const activeSelectedBatch = useMemo(() => {
    if (filterBatch === "all") return null;
    return (batches.data ?? []).find((b: any) => b.id === filterBatch) || null;
  }, [filterBatch, batches.data]);

  function logoForCode(c: CodeWithExtras): string | undefined {
    return (
      products.data?.find((p: any) => p.id === c.productId)?.imageUrls?.[0] ??
      company?.logoUrl ??
      undefined
    );
  }

  const handleGenerateAndDisplayBatchQr = async (
    batchId: string,
    productInfo: BatchProductInfo,
  ) => {
    try {
      toast.loading("Generating batch QR…", { id: "batch-qr-gen" });
      await generateBatchQrCode(batchId, productInfo);
      setSelectedBatchForQr({ batchId, productInfo });
      toast.success("Batch QR ready!", { id: "batch-qr-gen" });
    } catch (err) {
      console.error("Batch QR generation failed", err);
      toast.error("Failed to generate batch QR code", { id: "batch-qr-gen" });
    }
  };

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
      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900">All verification codes</h3>
          <p className="text-xs text-slate-500">
            Search, filter, and export any code. Showing up to 200 at a time. Tip: use search to
            jump to a code, or filter by product and batch before printing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
            28×32mm labels
          </span>
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "table" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
              }`}
              title="Table view"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-lg p-1.5 transition ${
                viewMode === "cards" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
              }`}
              title="Card view"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="cb-prod">Product</Label>
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger id="cb-prod" className="font-sans">
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
        <div className="space-y-1.5">
          <Label htmlFor="cb-batch">Batch</Label>
          <Select
            value={filterBatch}
            onValueChange={setFilterBatch}
            disabled={visibleBatches.length === 0}
          >
            <SelectTrigger id="cb-batch" className="font-sans">
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
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="cb-search">Search code</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              id="cb-search"
              placeholder="ASM-XXXX-XXXXXX"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 font-mono text-xs"
            />
          </div>
        </div>
        <div className="flex items-end gap-1.5">
          <Button
            variant={flaggedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFlaggedOnly((f) => !f)}
            className={`flex-1 text-xs ${flaggedOnly ? "bg-red-600 hover:bg-red-700" : ""}`}
          >
            <Flag className="mr-1 size-3.5" />
            {flaggedOnly ? "Flagged" : "All"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkPrint}
            disabled={!visibleCodes.length}
            className="flex-1 text-xs"
          >
            <Printer className="mr-1 size-3.5" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkZip}
            disabled={!visibleCodes.length}
            className="flex-1 text-xs"
          >
            <Archive className="mr-1 size-3.5" /> ZIP
          </Button>
        </div>
      </div>

      {activeSelectedBatch && (
        <BatchQrInlinePanel
          batchId={activeSelectedBatch.id}
          productInfo={{
            productName: activeSelectedBatch.productName || "Product",
            ...(activeSelectedBatch.batchNumber
              ? { batchNumber: activeSelectedBatch.batchNumber }
              : {}),
            productId: activeSelectedBatch.productId,
            quantity: activeSelectedBatch.quantity,
            brandName: companyName,
          }}
          onOpenModal={() =>
            handleGenerateAndDisplayBatchQr(activeSelectedBatch.id, {
              productName: activeSelectedBatch.productName || "Product",
              ...(activeSelectedBatch.batchNumber
                ? { batchNumber: activeSelectedBatch.batchNumber }
                : {}),
              productId: activeSelectedBatch.productId,
              quantity: activeSelectedBatch.quantity,
              brandName: companyName,
            })
          }
        />
      )}

      {/* Codes list */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        {codes.isPending ? (
          <div className="h-64 animate-pulse rounded-xl bg-slate-50" />
        ) : !visibleCodes.length ? (
          <div className="p-8">
            <EmptyState
              title="No codes found"
              description="Try clearing filters, or request your first batch to generate codes."
            />
          </div>
        ) : viewMode === "table" ? (
          <div className="overflow-x-auto">
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                <strong className="text-slate-900">{visibleCodes.length}</strong> codes
              </span>
              <span>Click a QR to download it</span>
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
                {visibleCodes.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-slate-50/60">
                    <TableCell>
                      <CodeQrThumbnail codeString={c.codeString} />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {c.codeString}
                      {c.flagged && <AlertTriangle className="ml-2 inline size-3.5 text-red-600" />}
                    </TableCell>
                    <TableCell className="max-w-36 truncate text-xs">{c.productName ?? "—"}</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500">
                      {c.batchNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
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
                        className="h-8 border-blue-200 text-xs text-blue-700 hover:bg-blue-50"
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
            <p className="text-xs text-slate-500">
              Displaying <strong className="text-slate-900">{visibleCodes.length}</strong> labels
            </p>
            <div className="grid place-items-center gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleCodes.slice(0, 48).map((c) => (
                <div
                  key={c.id}
                  className="flex w-full max-w-72 flex-col items-center rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  <div className="mb-2 flex w-full items-center justify-between border-b border-slate-100 pb-2 text-[11px] text-slate-500">
                    <span className="max-w-32 truncate font-medium text-slate-900">
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
                    className="mt-2 text-xs font-medium text-blue-700 hover:underline"
                  >
                    Full preview
                  </button>
                </div>
              ))}
            </div>
            {visibleCodes.length > 48 && (
              <p className="text-center text-xs text-slate-400">
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

      {selectedBatchForQr && (
        <BatchQrModal
          open={!!selectedBatchForQr}
          onOpenChange={(open) => !open && setSelectedBatchForQr(null)}
          batchId={selectedBatchForQr.batchId}
          productInfo={selectedBatchForQr.productInfo}
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
    return <div className="size-8 animate-pulse rounded bg-slate-100" />;
  }

  return (
    <button
      type="button"
      onClick={() => downloadDataUrl(dataUrl, `qr-${codeString}.png`)}
      className="size-8 overflow-hidden rounded-lg border border-slate-200 p-0.5 transition hover:ring-2 hover:ring-blue-500"
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
