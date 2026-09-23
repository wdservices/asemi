/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMyCompany, type Company } from "@/lib/auth";
import {
  fnCalculatePrice,
  fnExportBatch,
  fnGenerateBatchPaid,
  fnMarkCodesExported,
  formatMoney,
  getBatch,
  getWallet,
  listBatchCodeStrings,
  listBatches,
  listCodes,
  listProducts,
  type Batch,
  type Code,
  type PriceQuoteResult,
} from "@/lib/db";
import { PageHeader, EmptyState, StatCard, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  Sparkles,
  CheckCircle2,
  Loader2,
  Filter,
  FileText,
  QrCode,
  ChevronRight,
  Search,
  AlertTriangle,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useMemo, useRef } from "react";

export const Route = createFileRoute("/_authenticated/batches")({
  head: () => ({ meta: [{ title: "Batches & Codes — Asemi" }] }),
  component: BatchesPage,
});

type BatchWithProduct = Batch;

type CodeWithExtras = Code & {
  productName: string;
  batchNumber: string;
};

function BatchesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Batches & Codes"
        description="Request new verification code batches, review history, and manage your code bank."
      />
      <Tabs defaultValue="request" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="request">
            <Sparkles className="mr-2 size-4" /> Request batch
          </TabsTrigger>
          <TabsTrigger value="history">
            <FileText className="mr-2 size-4" /> Batch history
          </TabsTrigger>
          <TabsTrigger value="bank">
            <QrCode className="mr-2 size-4" /> Code bank
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
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              REQUEST BATCH TAB                             */
/* -------------------------------------------------------------------------- */

function RequestBatchTab() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(100);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    batch_id: string;
    batch_number: string;
    qty: number;
    charged: number;
  } | null>(null);

  const products = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    queryFn: () => listProducts(companyId!),
  });

  const wallet = useQuery({
    queryKey: ["wallet", companyId],
    enabled: !!companyId,
    queryFn: () => getWallet(companyId!),
  });

  const qty = Math.max(0, quantity | 0);
  const quote = useQuery({
    queryKey: ["price-quote", companyId, qty],
    enabled: !!companyId && qty > 0,
    staleTime: 30_000,
    queryFn: () => fnCalculatePrice(qty),
  });
  const pricing: PriceQuoteResult = quote.data ?? {
    requiresQuote: false,
    currency: wallet.data?.currency ?? "USD",
    symbol: "",
    free: 0,
    paid: qty,
    price: 0,
    breakdown: [],
  };

  const walletBalance = wallet.data?.creditBalance ?? 0;
  const walletCurrency = wallet.data?.currency ?? pricing.currency;
  const shortfall = pricing.price - walletBalance;
  const canAfford = shortfall <= 0 && !pricing.requiresQuote;

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function pollProgress(batchId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const b = await getBatch(batchId);
        if (!b) return;
        if (b.status === "generating" || b.status === "failed") {
          setProgress(Math.round((b.generationProgress || 0) * 100));
        }
        if (b.status === "ready" || b.status === "exported" || b.status === "failed") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        /* keep polling */
      }
    }, 2500);
  }

  const generateMutation = useMutation({
    mutationFn: async (vars: { productId: string; qty: number }) => {
      setProgress(3);
      setGenerating(true);
      try {
        const res = await fnGenerateBatchPaid({ productId: vars.productId, quantity: vars.qty });
        pollProgress(res.batchId);
        setProgress(100);
        return res;
      } catch (err) {
        // The batch may still be generating server-side — poll to find out.
        throw err;
      } finally {
        setGenerating(false);
      }
    },
    onSuccess: async (res) => {
      if (pollRef.current) clearInterval(pollRef.current);
      queryClient.invalidateQueries({ queryKey: ["batches", companyId] });
      queryClient.invalidateQueries({ queryKey: ["wallet", companyId] });
      queryClient.invalidateQueries({ queryKey: ["my-company"] });
      queryClient.invalidateQueries({ queryKey: ["company-stats"] });
      setResult({
        batch_id: res.batchId,
        batch_number: res.batchNumber,
        qty: res.quantity,
        charged: res.price,
      });
      toast.success(`Batch ${res.batchNumber} created!`);
    },
    onError: (err) => {
      if (pollRef.current) clearInterval(pollRef.current);
      toast.error(err instanceof Error ? err.message : "Generation failed");
      setProgress(0);
    },
  });

  function onRequest() {
    if (!productId || quantity <= 0) return;
    setConfirmOpen(true);
  }

  function confirmGenerate() {
    setConfirmOpen(false);
    setResult(null);
    setProgress(0);
    generateMutation.mutate({ productId, qty: quantity });
  }

  function resetForm() {
    setResult(null);
    setProgress(0);
    setQuantity(100);
  }

  if (products.isLoading) {
    return <div className="panel h-96 animate-pulse p-5" />;
  }

  if (!products.data?.length) {
    return (
      <EmptyState
        title="Create a product first"
        description="You need at least one product before you can request a batch of verification codes."
      />
    );
  }

  if (result) {
    return (
      <div className="panel p-8">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-full bg-genuine/10 text-genuine animate-stamp">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Batch created successfully
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono">{result.batch_number}</span> — {result.qty.toLocaleString()}{" "}
            codes · Charged {formatMoney(result.charged, walletCurrency)}
          </p>

          <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={() => exportCsvForBatch(result.batch_id, result.batch_number, result.qty)}
            >
              <Download className="size-4" /> Download CSV
            </Button>
            <Button onClick={() => exportQrSheetForBatch(result.batch_id, result.batch_number)}>
              <Printer className="size-4" /> Print QR sheet
            </Button>
          </div>
          <Button variant="ghost" className="mt-2" onClick={resetForm}>
            Request another batch <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="panel p-6 lg:col-span-3 space-y-5">
        <p className="eyebrow">Request new batch</p>

        <div className="space-y-1.5">
          <Label htmlFor="rb-product">Product *</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger id="rb-product">
              <SelectValue placeholder="Select a product…" />
            </SelectTrigger>
            <SelectContent>
              {products.data.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="rb-qty">Quantity *</Label>
            <div className="flex gap-1">
              {[50, 100, 500, 1000, 5000].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={`rounded-md border px-2 py-0.5 text-xs transition ${
                    quantity === q
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-accent"
                  }`}
                >
                  {q.toLocaleString()}
                </button>
              ))}
            </div>
          </div>
          <Input
            id="rb-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
          />
          <p className="text-xs text-muted-foreground">
            Min 1 code. Volume tiers apply automatically.
          </p>
        </div>

        {generating && (
          <div className="space-y-2 rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin text-primary" />
              Generating {quantity.toLocaleString()} unique codes…
            </div>
            <Progress value={progress} />
            <p className="text-xs text-muted-foreground">
              This can take a minute for large batches. Please keep this tab open.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="text-xs text-muted-foreground">
            Wallet balance:{" "}
            <span
              className={shortfall > 0 ? "font-medium text-invalid" : "font-medium text-foreground"}
            >
              {formatMoney(walletBalance, walletCurrency)}
            </span>
            {shortfall > 0 && (
              <>
                <span className="mx-1">·</span>
                <span className="text-invalid">Top up {formatMoney(shortfall, walletCurrency)} to proceed</span>
              </>
            )}
          </div>
          <Button
            onClick={onRequest}
            disabled={!productId || quantity <= 0 || !canAfford || generating}
          >
            <FileCode className="size-4" /> Request batch
          </Button>
        </div>
      </div>

      <div className="panel p-6 lg:col-span-2 space-y-4">
        <div>
          <p className="eyebrow">Live pricing</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold tracking-tight">
              {quote.isLoading
                ? "…"
                : pricing.requiresQuote
                  ? "Custom"
                  : formatMoney(pricing.price, pricing.currency)}
            </span>
            <span className="text-xs text-muted-foreground">
              for {quantity.toLocaleString()} codes
            </span>
          </div>
          {pricing.requiresQuote && (
            <p className="mt-1 text-xs text-caution-foreground">
              Volume exceeds 1,000,000 lifetime codes — contact sales for a custom quote.
            </p>
          )}
        </div>

        <div className="space-y-2 border-t pt-4">
          {pricing.breakdown.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Enter a quantity to see the pricing breakdown.
            </p>
          )}
          {pricing.breakdown.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{row.label}</span>
                {row.rate > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {row.qty.toLocaleString()} × {formatMoney(row.rate, pricing.currency)}
                  </span>
                )}
              </div>
              <span className="tabular-nums font-medium">
                {row.subtotal === 0 ? "FREE" : formatMoney(row.subtotal, pricing.currency)}
              </span>
            </div>
          ))}
        </div>

        {pricing.breakdown.length > 0 && (
          <div className="grid grid-cols-2 gap-3 border-t pt-4 text-xs">
            <div>
              <p className="text-muted-foreground">Free codes in this batch</p>
              <p className="mt-0.5 font-medium">{pricing.free.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Paid codes</p>
              <p className="mt-0.5 font-medium">{pricing.paid.toLocaleString()}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Currency</p>
              <p className="mt-0.5 font-medium">{pricing.currency}</p>
            </div>
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm batch request</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Product</span>
              <span className="font-medium">
                {products.data.find((p: any) => p.id === productId)?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity</span>
              <span className="font-medium tabular-nums">{quantity.toLocaleString()} codes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount to charge</span>
              <span className="font-display text-lg font-semibold">
                {formatMoney(pricing.price, pricing.currency)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Wallet after</span>
              <span>{formatMoney(Math.max(0, walletBalance - pricing.price), walletCurrency)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmGenerate} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Generating…
                </>
              ) : (
                <>Confirm and charge wallet</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            BATCH HISTORY TAB                               */
/* -------------------------------------------------------------------------- */

function BatchHistoryTab() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;

  const batches = useQuery({
    queryKey: ["batches", companyId],
    enabled: !!companyId,
    queryFn: () => listBatches(companyId!),
  });

  if (batches.isLoading) {
    return <div className="panel h-96 animate-pulse p-5" />;
  }
  if (!batches.data?.length) {
    return (
      <EmptyState
        title="No batches yet"
        description="Request your first batch from the Request batch tab."
      />
    );
  }

  return (
    <div className="panel overflow-hidden">
      <div className="grid grid-cols-2 gap-4 border-b p-5 sm:grid-cols-4">
        <StatCard label="Total batches" value={batches.data.length.toLocaleString()} />
        <StatCard
          label="Total codes"
          value={batches.data.reduce((s, b) => s + b.quantity, 0).toLocaleString()}
        />
        <StatCard
          label="Total spent"
          value={formatMoney(
            batches.data.reduce((s, b) => s + (b.amountCharged ?? 0), 0),
            batches.data[0]?.currency ?? "USD",
          )}
        />
        <StatCard
          label="Last batch"
          value={batches.data[0] ? new Date(batches.data[0].createdAt).toLocaleDateString() : "—"}
        />
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch number</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Charged</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.data.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.batchNumber}</TableCell>
                <TableCell>{b.productName ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.quantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(b.amountCharged ?? 0, b.currency)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(b.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={
                      b.status === "ready"
                        ? "ready"
                        : b.status === "exported"
                          ? "approved"
                          : b.status === "failed"
                            ? "escalated"
                            : "pending"
                    }
                  />
                  {b.status === "generating" && (
                    <span className="ml-2 text-[11px] tabular-nums text-muted-foreground">
                      {Math.round((b.generationProgress || 0) * 100)}%
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={b.status !== "ready" && b.status !== "exported"}
                      onClick={() => exportCsvForBatch(b.id, b.batchNumber, b.quantity)}
                    >
                      <Download className="size-3.5" /> CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={b.status !== "ready" && b.status !== "exported"}
                      onClick={() => exportQrSheetForBatch(b.id, b.batchNumber)}
                    >
                      <Printer className="size-3.5" /> Print
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               CODE BANK TAB                                */
/* -------------------------------------------------------------------------- */

function CodeBankTab() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;

  const [filterProduct, setFilterProduct] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);

  const products = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    queryFn: () => listProducts(companyId!),
  });

  const batches = useQuery({
    queryKey: ["batches", companyId],
    enabled: !!companyId,
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
    queryFn: async (): Promise<CodeWithExtras[]> => {
      const list = await listCodes(companyId!, {
        productId: filterProduct === "all" ? undefined : filterProduct,
        batchId: filterBatch === "all" ? undefined : filterBatch,
        flaggedOnly: flaggedOnly || undefined,
        limitN: 500,
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

  const searchClean = search.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const visibleCodes = useMemo(() => {
    if (!searchClean) return codes.data ?? [];
    return (codes.data ?? []).filter((c) =>
      c.codeString.toUpperCase().replace(/[^A-Z0-9]/g, "").includes(searchClean),
    );
  }, [codes.data, searchClean]);

  return (
    <div className="space-y-4">
      <div className="panel p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <div className="space-y-1.5">
          <Label htmlFor="cb-prod">
            <Filter className="mr-1 inline size-3" /> Product
          </Label>
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger id="cb-prod">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            <SelectTrigger id="cb-batch">
              <SelectValue placeholder="All batches" />
            </SelectTrigger>
            <SelectContent>
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
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cb-search"
              placeholder="XXXX-XXXX-XXXX"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={flaggedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFlaggedOnly((f) => !f)}
            className="w-full justify-center"
          >
            <Flag className="size-3.5" />
            {flaggedOnly ? "Flagged only" : "Show all"}
          </Button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        {codes.isLoading ? (
          <div className="h-96 animate-pulse" />
        ) : !visibleCodes.length ? (
          <div className="p-12">
            <EmptyState
              title="No codes match"
              description="Adjust filters or request a new batch to generate codes."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Scans</TableHead>
                  <TableHead className="text-right">Printed</TableHead>
                  <TableHead>Exported</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCodes.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      {c.codeString}
                      {c.flagged && (
                        <span className="ml-2 inline-flex align-middle">
                          <AlertTriangle className="size-3.5 text-invalid" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{c.productName ?? "—"}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {c.batchNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(c.scanCount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.printCount ?? 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.exportedAt ? new Date(c.exportedAt).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.flagged ? "escalated" : "approved"} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.reviewStatus} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {codes.data && codes.data.length >= 500 && (
          <p className="border-t p-3 text-center text-xs text-muted-foreground">
            Showing first 500 matches. Use filters to narrow results.
          </p>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 HELPERS                                    */
/* -------------------------------------------------------------------------- */

async function exportCsvForBatch(batchId: string, batchNumber: string, fallbackQty: number) {
  try {
    toast.loading(`Fetching ${fallbackQty.toLocaleString()} codes…`, { id: "csv" });
    const strings = await listBatchCodeStrings(batchId);

    const lines = ["code_string"];
    for (const s of strings) lines.push(s);

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asemi-${batchNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    try {
      await fnMarkCodesExported(batchId);
    } catch {
      /* non-critical: print_count / exported_at are best-effort */
    }
    toast.success(`Downloaded ${strings.length.toLocaleString()} codes`, { id: "csv" });
  } catch (err) {
    console.error(err);
    toast.error(err instanceof Error ? err.message : "CSV export failed", { id: "csv" });
  }
}

async function exportQrSheetForBatch(batchId: string, batchNumber: string) {
  const loadId = toast.loading(`Generating print files for ${batchNumber}…`);
  try {
    const res = await fnExportBatch(batchId);
    const win = window.open(res.pdfUrl, "_blank");
    toast.success(
      `Print files ready — ${res.totalCodes.toLocaleString()} codes` +
        (res.pdfCapped ? ` (PDF capped at ${res.pdfCodes.toLocaleString()}; full CSV also ready)` : ""),
      { id: loadId },
    );
    if (!win) {
      const a = document.createElement("a");
      a.href = res.pdfUrl;
      a.download = `asemi-${batchNumber}-labels.pdf`;
      a.click();
    }
    // Offer the CSV too.
    const csvLink = document.createElement("a");
    csvLink.href = res.csvUrl;
    csvLink.download = `asemi-${batchNumber}.csv`;
    csvLink.click();
  } catch (err) {
    console.error(err);
    toast.error(err instanceof Error ? err.message : "Export failed", { id: loadId });
  }
}
