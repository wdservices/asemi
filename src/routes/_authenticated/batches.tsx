/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fb as supabase } from "@/integrations/firebase/client";
import { useMyCompany, type Company } from "@/lib/auth";
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
import type { Tables, Database } from "@/integrations/firebase/types";
import { calculatePriceLocal, formatNaira, type PricingBreakdown } from "@/lib/pricing";
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
import { useState, useMemo, useEffect } from "react";
import QRCode from "qrcode";

export const Route = createFileRoute("/_authenticated/batches")({
  head: () => ({ meta: [{ title: "Batches & Codes — Asemi" }] }),
  component: BatchesPage,
});

type BatchWithProduct = Tables<"batches"> & {
  amount_charged: number;
  products: { name: string } | null;
};

type CodeWithExtras = Tables<"codes"> & {
  products: { name: string } | null;
  batches: { batch_number: string } | null;
  exported_at: string | null;
  print_count: number;
  code_string?: string;
  flagged?: boolean;
  scan_count?: number;
  review_status?: string | null;
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const wallet = useQuery({
    queryKey: ["wallet", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wallets")
        .select("credit_balance")
        .eq("company_id", companyId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as { credit_balance: number } | null;
    },
  });

  const pricing = useMemo(() => {
    type CompanyEx = Company & {
      total_codes_generated?: number;
      free_codes_used?: number;
    };
    const cEx = company as CompanyEx | null | undefined;
    const totalGenerated = cEx?.total_codes_generated ?? 0;
    const freeUsed = cEx?.free_codes_used ?? 0;
    const freeRemaining = Math.max(0, 20 - freeUsed);
    const q = Math.max(0, quantity | 0);
    return calculatePriceLocal(q, totalGenerated, freeRemaining);
  }, [company, quantity]);

  const walletBalance = wallet.data?.credit_balance ?? 0;
  const shortfall = pricing.totalPrice - walletBalance;
  const canAfford = shortfall <= 0;

  const generateMutation = useMutation({
    mutationFn: async (vars: { productId: string; qty: number }) => {
      setProgress(5);
      setGenerating(true);
      const interval = setInterval(() => setProgress((p) => Math.min(p + 8, 92)), 350);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase.rpc as any)("generate_batch_paid", {
          _product_id: vars.productId,
          _quantity: vars.qty,
        });
        if (error) throw error;
        setProgress(100);
        return data as unknown as string;
      } finally {
        clearInterval(interval);
        setGenerating(false);
      }
    },
    onSuccess: async (batchNum) => {
      queryClient.invalidateQueries({ queryKey: ["batches", companyId] });
      queryClient.invalidateQueries({ queryKey: ["wallet", companyId] });
      queryClient.invalidateQueries({ queryKey: ["my-company"] });
      queryClient.invalidateQueries({ queryKey: ["company-stats"] });

      const { data: batchData } = await supabase
        .from("batches")
        .select("id, batch_number, quantity, amount_charged")
        .eq("batch_number", batchNum)
        .maybeSingle();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const b = batchData as any;
      setResult({
        batch_id: b?.id ?? "",
        batch_number: batchNum,
        qty: b?.quantity ?? quantity,
        charged: b?.amount_charged ?? pricing.totalPrice,
      });
      toast.success(`Batch ${batchNum} created!`);
    },
    onError: (err) => {
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
            codes · Charged {formatNaira(result.charged)}
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
              {formatNaira(walletBalance)}
            </span>
            {shortfall > 0 && (
              <>
                <span className="mx-1">·</span>
                <span className="text-invalid">Top up {formatNaira(shortfall)} to proceed</span>
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
              {formatNaira(pricing.totalPrice)}
            </span>
            <span className="text-xs text-muted-foreground">
              for {quantity.toLocaleString()} codes
            </span>
          </div>
        </div>

        <div className="space-y-2 border-t pt-4">
          {pricing.breakdown.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Enter a quantity to see the pricing breakdown.
            </p>
          )}
          {pricing.breakdown.map((row: PricingBreakdown, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-md bg-secondary/60 px-3 py-2 text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{row.label}</span>
                {row.rate > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {row.qty.toLocaleString()} × {formatNaira(row.rate)}
                  </span>
                )}
              </div>
              <span className="tabular-nums font-medium">
                {row.subtotal === 0 ? "FREE" : formatNaira(row.subtotal)}
              </span>
            </div>
          ))}
        </div>

        {pricing.breakdown.length > 0 && (
          <div className="grid grid-cols-2 gap-3 border-t pt-4 text-xs">
            <div>
              <p className="text-muted-foreground">Free codes used</p>
              <p className="mt-0.5 font-medium">{pricing.freeCodesUsed.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Free remaining</p>
              <p className="mt-0.5 font-medium text-genuine">
                {pricing.freeCodesRemaining.toLocaleString()}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Total codes generated after this batch</p>
              <p className="mt-0.5 font-medium">{pricing.totalCodesAfter.toLocaleString()}</p>
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
                {formatNaira(pricing.totalPrice)}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Wallet after</span>
              <span>{formatNaira(Math.max(0, walletBalance - pricing.totalPrice))}</span>
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batches")
        .select(
          `
          id, batch_number, quantity, status, created_at, product_id, company_id,
          amount_charged,
          products(name)
        `,
        )
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BatchWithProduct[];
    },
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
          value={formatNaira(batches.data.reduce((s, b) => s + (b.amount_charged ?? 0), 0))}
        />
        <StatCard
          label="Last batch"
          value={batches.data[0] ? new Date(batches.data[0].created_at).toLocaleDateString() : "—"}
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
                <TableCell className="font-mono text-xs">{b.batch_number}</TableCell>
                <TableCell>{b.products?.name ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {b.quantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatNaira(b.amount_charged ?? 0)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {new Date(b.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <StatusBadge
                    status={
                      b.status === "ready"
                        ? "ready"
                        : (b.status as any) === "open"
                          ? "open"
                          : "pending"
                    }
                  />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportCsvForBatch(b.id, b.batch_number, b.quantity)}
                    >
                      <Download className="size-3.5" /> CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportQrSheetForBatch(b.id, b.batch_number)}
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const batches = useQuery({
    queryKey: ["batches", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batches")
        .select("id,batch_number,product_id")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const visibleBatches = useMemo(() => {
    if (filterProduct === "all") return batches.data ?? [];
    return (batches.data ?? []).filter((b: any) => b.product_id === filterProduct);
  }, [batches.data, filterProduct]);

  useEffect(() => {
    if (filterProduct !== "all" && filterBatch !== "all") {
      const stillValid = visibleBatches.some((b: any) => b.id === filterBatch);
      if (!stillValid) setFilterBatch("all");
    }
  }, [filterProduct, visibleBatches, filterBatch]);

  const codes = useQuery({
    queryKey: ["codes-bank", companyId, filterProduct, filterBatch, flaggedOnly, search],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("codes")
        .select(
          `
          id, code_string, scan_count, flagged, review_status, last_scanned_at,
          created_at, product_id, batch_id, company_id,
          exported_at, print_count,
          products(name),
          batches(batch_number)
        `,
        )
        .eq("company_id", companyId!);

      if (filterProduct !== "all") q = q.eq("product_id", filterProduct);
      if (filterBatch !== "all") q = q.eq("batch_id", filterBatch);
      if (flaggedOnly) q = q.eq("flagged", true);
      if (search.trim()) {
        q = q.ilike("code_string", `%${search.replace(/[^A-Z0-9-]/gi, "")}%`);
      }

      const { data, error } = await q.order("created_at", { ascending: false }).limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as CodeWithExtras[];
    },
  });

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
                  {b.batch_number}
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
        ) : !codes.data?.length ? (
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
                {codes.data.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">
                      {c.code_string}
                      {c.flagged && (
                        <span className="ml-2 inline-flex align-middle">
                          <AlertTriangle className="size-3.5 text-invalid" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{c.products?.name ?? "—"}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {c.batches?.batch_number ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {c.scan_count.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{c.print_count ?? 0}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.exported_at ? new Date(c.exported_at).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.flagged ? "escalated" : "approved"} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.review_status} />
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
    toast.loading(`Fetching ${fallbackQty.toLocaleString()} codes…`, {
      id: "csv",
    });
    const { data, error } = await supabase
      .from("codes")
      .select("code_string")
      .eq("batch_id", batchId)
      .order("code_string");
    if (error) throw error;

    const lines = ["code_string"];
    for (const row of data ?? []) lines.push(row.code_string);

    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asemi-${batchNumber}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${(data?.length ?? 0).toLocaleString()} codes`, {
      id: "csv",
    });
  } catch (err) {
    console.error(err);
    toast.error(err instanceof Error ? err.message : "CSV export failed", {
      id: "csv",
    });
  }
}

async function exportQrSheetForBatch(batchId: string, batchNumber: string) {
  try {
    const loadId = toast.loading(`Generating QR images for ${batchNumber}…`);
    const { data, error } = await supabase
      .from("codes")
      .select("code_string")
      .eq("batch_id", batchId)
      .order("code_string")
      .limit(500);
    if (error) throw error;

    const rows = data ?? [];
    if (!rows.length) {
      toast.error("No codes found in batch", { id: loadId });
      return;
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const qrDataUris: { code: string; uri: string; url: string }[] = [];
    for (const r of rows) {
      const url = `${origin}/v/${r.code_string}`;
      const uri = await QRCode.toDataURL(url, {
        margin: 1,
        width: 180,
        errorCorrectionLevel: "M",
      });
      qrDataUris.push({ code: r.code_string, uri, url });
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.rpc as any)("mark_codes_exported", { _batch_id: batchId });
    } catch {
      /* non-critical: print_count / exported_at are best-effort */
    }

    const cells = qrDataUris.map(
      (q) => `
      <td class="cell">
        <div class="card">
          <img src="${q.uri}" alt="QR" />
          <div class="code">${q.code}</div>
          <div class="url">${q.url.replace(/^https?:\/\//, "")}</div>
        </div>
      </td>`,
    );

    const htmlRows: string[] = [];
    for (let i = 0; i < cells.length; i += 4) {
      htmlRows.push(`<tr>${cells.slice(i, i + 4).join("")}</tr>`);
    }

    const html = `<!doctype html><html><head><meta charset="utf-8" /><title>Batch ${batchNumber} — QR Codes</title>
    <style>
      @page { size: A4; margin: 10mm; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; color: #111; margin: 0; }
      h1 { font-size: 14px; margin: 0 0 2mm; letter-spacing: .02em; font-weight: 600; }
      .subtitle { font-size: 10px; color: #666; margin-bottom: 5mm; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      td.cell { padding: 3mm; vertical-align: top; }
      .card { border: 1px solid #ddd; border-radius: 6px; padding: 4mm 2mm 3mm; text-align: center; }
      .card img { width: 36mm; height: 36mm; display: block; margin: 0 auto 2mm; }
      .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 10px; font-weight: 600; letter-spacing: .04em; }
      .url { font-size: 8px; color: #888; margin-top: 1mm; word-break: break-all; }
    </style></head>
    <body>
      <h1>Asemi — Batch ${batchNumber}</h1>
      <div class="subtitle">${qrDataUris.length.toLocaleString()} verification codes · Generated ${new Date().toLocaleString()}</div>
      <table>${htmlRows.join("")}</table>
      <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); }</script>
    </body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      toast.success("QR sheet ready — check the print dialog", { id: loadId });
    } else {
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asemi-${batchNumber}-qr.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("QR sheet downloaded as HTML", { id: loadId });
    }
  } catch (err) {
    console.error(err);
    toast.error(err instanceof Error ? err.message : "QR export failed");
  }
}
