/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMyCompany, type Company } from "@/lib/auth";
import {
  formatMoney,
  listBatchCodeStrings,
  listBatches,
  listCodes,
  listProducts,
  type Code,
} from "@/lib/db";
import {
  calculateBatchPrice,
  createBatchWithCodes,
  type ClientCalculatePriceResult,
} from "@/lib/batch-service";
import {
  generateQrDataUrl,
  downloadDataUrl,
  generateBatchQrCode,
  downloadBatchQr,
  type BatchProductInfo,
  type BatchQrResult,
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
  Sparkles,
  CheckCircle2,
  Filter,
  FileText,
  QrCode,
  ChevronRight,
  Search,
  AlertTriangle,
  Flag,
  CircleDot,
  RectangleHorizontal,
  LayoutGrid,
  List,
  Eye,
  Archive,
  ArrowRight,
  Check,
  History,
  Calendar,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { PaymentGatewayModal } from "@/components/asemi/PaymentGatewayModal";
import { ProductTagPreview } from "@/components/asemi/ProductTagPreview";
import { TagPreviewModal } from "@/components/asemi/TagPreviewModal";
import { BatchQrModal } from "@/components/asemi/BatchQrModal";
import { BatchQrInlinePanel } from "@/components/asemi/BatchQrInlinePanel";

export const Route = createFileRoute("/_authenticated/batches")({
  head: () => ({ meta: [{ title: "Batches & Codes — Asemi" }] }),
  component: BatchesPage,
});

type CodeWithExtras = Code & {
  productName: string;
  batchNumber: string;
};

function BatchesPage() {
  const [activeTab, setActiveTab] = useState("request");

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/15 bg-primary/[0.06] p-5 md:p-6">
        <PageHeader
          title="Batches & Codes"
          description="Create, download, and track every verification code in one place."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Fast creation</p>
            <p className="mt-1 text-sm font-semibold">Generate in seconds</p>
          </div>
          <div className="rounded-xl bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Flexible exports</p>
            <p className="mt-1 text-sm font-semibold">QR, CSV, and labels</p>
          </div>
          <div className="rounded-xl bg-background/70 p-3">
            <p className="text-xs text-muted-foreground">Always organized</p>
            <p className="mt-1 text-sm font-semibold">History and code bank</p>
          </div>
        </div>
      </div>
      <div>
        <PageHeader
          title="Workspace"
          description="Request new verification code batches, review history, and manage your dynamic QR code bank."
        />
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tabs keep the batch workflow in one predictable, fast surface. */}
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
          <RequestBatchTab onGoToBank={() => setActiveTab("bank")} />
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

function RequestBatchTab({ onGoToBank }: { onGoToBank: () => void }) {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;
  const companyName = company?.name || "Asemi Brand";
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(100);
  const [tagFormat, setTagFormat] = useState<"circle" | "rectangle">("rectangle");
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [result, setResult] = useState<{
    batch_id: string;
    batch_number: string;
    qty: number;
    charged: number;
    codes: string[];
    product_name: string;
    tagFormat: "circle" | "rectangle";
  } | null>(null);

  const products = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    queryFn: () => listProducts(companyId!),
  });

  const qty = Math.max(0, quantity | 0);
  const pricing: ClientCalculatePriceResult = useMemo(() => {
    return calculateBatchPrice(qty, company?.countryCode || "NG");
  }, [qty, company?.countryCode]);

  const selectedProduct = products.data?.find((p: any) => p.id === productId);

  async function handleAuthorizePayment(onProgress: (p: number) => void) {
    if (!companyId || !productId || !selectedProduct) {
      throw new Error("Product and company required");
    }

    const res = await createBatchWithCodes({
      companyId,
      companyName,
      countryCode: company?.countryCode || "NG",
      productId,
      productName: selectedProduct.name,
      quantity: qty,
      amountCharged: pricing.price,
      currency: pricing.currency,
      tagFormat,
      onProgress,
    });

    // Invalidate queries so history and code bank refresh immediately
    queryClient.invalidateQueries({ queryKey: ["batches", companyId] });
    queryClient.invalidateQueries({ queryKey: ["codes-bank"] });
    queryClient.invalidateQueries({ queryKey: ["my-company"] });
    queryClient.invalidateQueries({ queryKey: ["company-stats"] });

    setResult({
      batch_id: res.batchId,
      batch_number: res.batchNumber,
      qty: res.quantity,
      charged: pricing.price,
      codes: res.codes,
      product_name: selectedProduct.name,
      tagFormat: res.tagFormat || tagFormat,
    });

    toast.success(
      `Batch ${res.batchNumber} generated with ${tagFormat === "circle" ? "Circular Tags" : "Rectangular Labels"}!`,
    );
  }

  function resetForm() {
    setResult(null);
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
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 animate-stamp">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">
            Batch Generated Successfully!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="font-mono font-medium text-foreground">{result.batch_number}</span> —{" "}
            {result.qty.toLocaleString()} verification codes created for{" "}
            <span className="font-semibold text-foreground">{result.product_name}</span>.
          </p>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-xs text-amber-900 dark:text-amber-300 font-semibold font-mono">
              <Sparkles className="size-3.5 text-[#caa33a]" />
              Format:{" "}
              {result.tagFormat === "circle"
                ? "Circular Tag (30mm Seal)"
                : "Rectangular Label (50×25mm)"}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Dynamic QR codes & holographic tags generated and ready
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-sm"
              onClick={onGoToBank}
            >
              <QrCode className="size-4" /> View in Code Bank <ArrowRight className="size-4" />
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                downloadTagsZip({
                  batchNumber: result.batch_number,
                  productName: result.product_name,
                  brandName: companyName,
                  codes: result.codes,
                  style: result.tagFormat || "rectangle",
                })
              }
              className="gap-2 border-amber-500/40 hover:bg-amber-500/10"
            >
              <Archive className="size-4 text-[#caa33a]" /> Download{" "}
              {result.tagFormat === "circle" ? "Circular Tags" : "Rectangular Labels"} (ZIP)
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                printTagSheet({
                  batchNumber: result.batch_number,
                  productName: result.product_name,
                  brandName: companyName,
                  codes: result.codes,
                  style: result.tagFormat || "rectangle",
                })
              }
              className="gap-2 border-amber-500/40 hover:bg-amber-500/10"
            >
              <Printer className="size-4 text-[#caa33a]" /> Print Adhesive Sheet (
              {result.tagFormat === "circle" ? "Round" : "Sticker"})
            </Button>

            <Button
              variant="outline"
              onClick={() => exportCsvForBatch(result.batch_id, result.batch_number, result.qty)}
              className="gap-2"
            >
              <Download className="size-4" /> Export CSV List
            </Button>
          </div>

          <Button variant="ghost" className="mt-4 text-xs" onClick={resetForm}>
            Request another batch <ChevronRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="panel p-6 lg:col-span-3 space-y-5">
        <div className="flex items-center justify-between">
          <p className="eyebrow">Request new batch</p>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="size-3.5 text-amber-500" /> Instant QR code generation
          </span>
        </div>

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

        {/* Security Tag / Label Layout Format Selector */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Security Tag Layout Format *</Label>
            <span className="text-[11px] font-mono text-amber-900 dark:text-amber-300 font-medium">
              Selected:{" "}
              {tagFormat === "circle" ? "Circular Tag (30mm)" : "Rectangular Label (50×25mm)"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Circular Tag */}
            <button
              type="button"
              onClick={() => setTagFormat("circle")}
              className={`relative flex flex-col gap-2 rounded-xl border-2 p-3.5 text-left transition-all ${
                tagFormat === "circle"
                  ? "border-[#b8932c] bg-amber-500/10 shadow-sm ring-1 ring-[#b8932c]"
                  : "border-border bg-card hover:border-[#b8932c]/50 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-amber-600 bg-gradient-to-br from-[#fff5be] via-[#e0b53c] to-[#835f10] shadow-sm">
                    <CircleDot className="size-4 text-zinc-950" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">Circular Tag</h4>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      30mm Round Seal
                    </span>
                  </div>
                </div>
                {tagFormat === "circle" ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b8932c] text-white">
                    <Check className="size-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="h-5 w-5 rounded-full border border-muted-foreground/30" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Concentric gold medallion with serrated edge security teeth, scratch-off
                authentication layer &amp; center dynamic QR.
              </p>
              <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-amber-900 dark:text-amber-300">
                <span className="text-muted-foreground">Best for:</span>
                <span className="bg-amber-500/20 px-1.5 py-0.5 rounded">Bottle caps</span>
                <span className="bg-amber-500/20 px-1.5 py-0.5 rounded">Jars</span>
                <span className="bg-amber-500/20 px-1.5 py-0.5 rounded">Seals</span>
              </div>
            </button>

            {/* Rectangular Label */}
            <button
              type="button"
              onClick={() => setTagFormat("rectangle")}
              className={`relative flex flex-col gap-2 rounded-xl border-2 p-3.5 text-left transition-all ${
                tagFormat === "rectangle"
                  ? "border-[#b8932c] bg-amber-500/10 shadow-sm ring-1 ring-[#b8932c]"
                  : "border-border bg-card hover:border-[#b8932c]/50 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-600 bg-gradient-to-br from-[#fff8cb] via-[#d4a737] to-[#c19225] shadow-sm">
                    <RectangleHorizontal className="size-4 text-zinc-950" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-foreground">Rectangular Label</h4>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      50×25mm Adhesive Label
                    </span>
                  </div>
                </div>
                {tagFormat === "rectangle" ? (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#b8932c] text-white">
                    <Check className="size-3 stroke-[3]" />
                  </span>
                ) : (
                  <span className="h-5 w-5 rounded-full border border-muted-foreground/30" />
                )}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                Gold holographic security sticker with high-contrast QR plate, registered brand
                emblem &amp; scrape verification layer.
              </p>
              <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-amber-900 dark:text-amber-300">
                <span className="text-muted-foreground">Best for:</span>
                <span className="bg-amber-500/20 px-1.5 py-0.5 rounded">Tea boxes</span>
                <span className="bg-amber-500/20 px-1.5 py-0.5 rounded">Cartons</span>
                <span className="bg-amber-500/20 px-1.5 py-0.5 rounded">Packs</span>
              </div>
            </button>
          </div>
        </div>

        {/* Security Sticker Preview Card */}
        <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2 text-[#caa33a]">
              <Sparkles className="size-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-foreground">
                Tamper-Evident Physical Security Stickers Included
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every code comes with high-resolution holographic stickers ready for your product
                packaging (such as tea boxes, pharmaceuticals, and consumer goods), complete with
                dynamic QR codes and scratch-off authentication layers.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <div className="text-xs text-muted-foreground">
            Payment authorization:{" "}
            <span className="font-semibold text-foreground">
              {formatMoney(pricing.price, pricing.currency)}
            </span>
            <span className="mx-1.5">·</span>
            <span>Simulated gateway checkout</span>
          </div>

          <Button
            onClick={() => setPaymentModalOpen(true)}
            disabled={!productId || quantity <= 0}
            className="bg-zinc-950 hover:bg-black text-white gap-2"
          >
            <FileCode className="size-4" /> Proceed to Payment Authorization
          </Button>
        </div>
      </div>

      {/* Live Pricing Breakdown */}
      <div className="panel p-6 lg:col-span-2 space-y-4">
        <div>
          <p className="eyebrow">Live pricing</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold tracking-tight">
              {formatMoney(pricing.price, pricing.currency)}
            </span>
            <span className="text-xs text-muted-foreground">for {qty.toLocaleString()} codes</span>
          </div>
        </div>

        <div className="space-y-2 border-t pt-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cost per code:</span>
            <span className="font-medium">
              {pricing.currency} {(pricing.price / Math.max(1, qty)).toFixed(2)} / unit
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Holographic Tag Assets:</span>
            <span className="font-medium text-emerald-600">Included (Free)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Verification Gateway:</span>
            <span className="font-medium text-emerald-600">Instant Active</span>
          </div>
        </div>

        <div className="rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Volume Tiers:</p>
          <p>• 1 – 5,000: Standard rate</p>
          <p>• 5,001 – 20,000: 20% discount</p>
          <p>• 20,001 – 100,000: 40% discount</p>
          <p>• 100,001+: 76% volume discount</p>
        </div>

        {/* Dynamic Tag Layout Live Preview */}
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-[#caa33a]" /> Live Layout Preview
            </span>
            <span className="text-[10px] font-mono text-amber-900 dark:text-amber-300 font-bold bg-amber-500/20 px-2 py-0.5 rounded">
              {tagFormat === "circle" ? "Circular Tag (30mm)" : "Rectangular Label"}
            </span>
          </div>
          <div className="flex justify-center py-1">
            <ProductTagPreview
              codeString="ASM-SAMPLE-CODE"
              productName={selectedProduct?.name || "Product Authentication"}
              brandName={companyName}
              batchNumber="SAMPLE"
              style={tagFormat}
              showActions={false}
              size="sm"
            />
          </div>
          <p className="text-[11px] text-center text-muted-foreground">
            Selected format applied to all {qty.toLocaleString()} codes upon generation.
          </p>
        </div>
      </div>

      {/* Simulated Payment Gateway Modal */}
      {selectedProduct && (
        <PaymentGatewayModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          productName={selectedProduct.name}
          quantity={qty}
          amount={pricing.price}
          currency={pricing.currency}
          onAuthorize={handleAuthorizePayment}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                            BATCH HISTORY TAB                               */
/* -------------------------------------------------------------------------- */

function BatchHistoryTab() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;
  const companyName = company?.name || "Asemi Brand";

  const batches = useQuery({
    queryKey: ["batches", companyId],
    enabled: !!companyId,
    queryFn: () => listBatches(companyId!),
  });

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
    style: "rectangle" | "circle",
  ) {
    try {
      const loadId = toast.loading(`Preparing tags for ${batchNumber}…`);
      const codeStrings = await listBatchCodeStrings(batchId);
      await downloadTagsZip({
        batchNumber,
        productName,
        brandName: companyName,
        codes: codeStrings,
        style,
        onProgress: (cur, tot) => {
          toast.loading(`Exporting tags (${cur}/${tot})…`, { id: loadId });
        },
      });
      toast.success(`Downloaded tags ZIP for ${batchNumber}`, { id: loadId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate tag zip");
    }
  }

  async function handleBatchPrintSheet(
    batchId: string,
    batchNumber: string,
    productName: string,
    style: "rectangle" | "circle",
  ) {
    try {
      toast.loading("Generating printable sticker sheet…", { id: "print-sheet" });
      const codeStrings = await listBatchCodeStrings(batchId);
      await printTagSheet({
        batchNumber,
        productName,
        brandName: companyName,
        codes: codeStrings,
        style,
      });
      toast.success("Print sheet ready!", { id: "print-sheet" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to open print sheet", { id: "print-sheet" });
    }
  }

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
              <TableHead>Format</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Charged</TableHead>
              <TableHead className="text-right">Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Stickers & Exports</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.data.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs font-semibold">{b.batchNumber}</TableCell>
                <TableCell>{b.productName ?? "—"}</TableCell>
                <TableCell>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-medium ${
                      b.tagFormat === "circle"
                        ? "bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30"
                        : "bg-muted text-muted-foreground border"
                    }`}
                  >
                    {b.tagFormat === "circle" ? "● Circular Tag" : "▬ Rect Label"}
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums font-medium">
                  {b.quantity.toLocaleString()}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatMoney(b.amountCharged ?? 0, b.currency)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground text-xs">
                  {new Date(b.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <StatusBadge status="approved" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setHistoryBatchForQr({
                          batchId: b.id,
                          productInfo: {
                            productName: b.productName || "Product",
                            batchNumber: b.batchNumber,
                            productId: b.productId,
                            quantity: b.quantity,
                            brandName: companyName,
                            tagFormat: b.tagFormat || "rectangle",
                          },
                        })
                      }
                      className="gap-1 text-xs border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/10"
                      title="Generate and download dynamic QR code for this batch"
                    >
                      <QrCode className="size-3.5 text-[#caa33a]" /> Batch QR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSelectedBatchForTags({
                          id: b.id,
                          batchNumber: b.batchNumber,
                          productName: b.productName || "Product",
                          quantity: b.quantity,
                          tagFormat: b.tagFormat || "rectangle",
                        })
                      }
                      className="gap-1.5 text-xs border-[#b8932c]/50 text-amber-900 dark:text-amber-300 hover:bg-amber-500/10"
                    >
                      <Sparkles className="size-3.5 text-[#caa33a]" /> Tags & Print
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportCsvForBatch(b.id, b.batchNumber, b.quantity)}
                      className="gap-1 text-xs"
                    >
                      <Download className="size-3.5" /> CSV
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Batch Tags Export Dialog */}
      {selectedBatchForTags && (
        <Dialog
          open={!!selectedBatchForTags}
          onOpenChange={(open) => !open && setSelectedBatchForTags(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-[#caa33a]" /> Download Tags for Batch{" "}
                {selectedBatchForTags.batchNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm">
              <p className="text-xs text-muted-foreground">
                Choose your tag style to download high-resolution PNG stickers (zipped) or generate
                a printable adhesive sheet.
              </p>

              <div className="space-y-2">
                <div
                  className={`rounded-lg border p-3 flex items-center justify-between transition-all ${
                    selectedBatchForTags.tagFormat === "rectangle"
                      ? "border-[#b8932c] bg-amber-500/10 shadow-xs"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <RectangleHorizontal className="size-5 text-[#caa33a]" />
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <span>Holographic Rectangular Seal</span>
                        {selectedBatchForTags.tagFormat === "rectangle" && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.2 font-mono text-[9px] text-amber-900 dark:text-amber-300 font-bold">
                            Batch Default
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        50×25mm adhesive packaging sticker
                      </div>
                    </div>
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
                          "rectangle",
                        )
                      }
                      className="text-xs h-8"
                    >
                      <Printer className="size-3.5 mr-1" /> Print
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleBatchTagsZip(
                          selectedBatchForTags.id,
                          selectedBatchForTags.batchNumber,
                          selectedBatchForTags.productName,
                          "rectangle",
                        )
                      }
                      className="text-xs h-8 bg-zinc-950 hover:bg-black text-white"
                    >
                      <Archive className="size-3.5 mr-1" /> ZIP
                    </Button>
                  </div>
                </div>

                <div
                  className={`rounded-lg border p-3 flex items-center justify-between transition-all ${
                    selectedBatchForTags.tagFormat === "circle"
                      ? "border-[#b8932c] bg-amber-500/10 shadow-xs"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CircleDot className="size-5 text-[#caa33a]" />
                    <div>
                      <div className="font-semibold text-xs flex items-center gap-1.5">
                        <span>Circular Tamper Badge</span>
                        {selectedBatchForTags.tagFormat === "circle" && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.2 font-mono text-[9px] text-amber-900 dark:text-amber-300 font-bold">
                            Batch Default
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        30mm round concentric medallion
                      </div>
                    </div>
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
                          "circle",
                        )
                      }
                      className="text-xs h-8"
                    >
                      <Printer className="size-3.5 mr-1" /> Print
                    </Button>
                    <Button
                      size="sm"
                      onClick={() =>
                        handleBatchTagsZip(
                          selectedBatchForTags.id,
                          selectedBatchForTags.batchNumber,
                          selectedBatchForTags.productName,
                          "circle",
                        )
                      }
                      className="text-xs h-8 bg-zinc-950 hover:bg-black text-white"
                    >
                      <Archive className="size-3.5 mr-1" /> ZIP
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Dynamic Batch QR Code Modal */}
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

  const [tagStyle, setTagStyle] = useState<"rectangle" | "circle">("rectangle");
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [filterProduct, setFilterProduct] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [previewCode, setPreviewCode] = useState<CodeWithExtras | null>(null);
  const [selectedBatchForQr, setSelectedBatchForQr] = useState<{
    batchId: string;
    productInfo: BatchProductInfo;
  } | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(true);

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

  // Sync format automatically when user selects a batch
  useEffect(() => {
    if (activeSelectedBatch?.tagFormat) {
      setTagStyle(activeSelectedBatch.tagFormat);
    }
  }, [activeSelectedBatch?.tagFormat]);

  /**
   * Dynamically generates and displays a QR code for a batch,
   * with full product information and download buttons for the user.
   */
  const handleGenerateAndDisplayBatchQr = async (
    batchId: string,
    productInfo: BatchProductInfo,
  ) => {
    try {
      toast.loading("Generating dynamic batch QR code…", { id: "batch-qr-gen" });
      const res = await generateBatchQrCode(batchId, productInfo);
      setSelectedBatchForQr({ batchId, productInfo });
      toast.success(`Dynamic QR code ready for batch ${productInfo.batchNumber || batchId}!`, {
        id: "batch-qr-gen",
      });
      return res;
    } catch (err) {
      return null;
      console.error("Batch QR generation failed", err);
      toast.error("Failed to generate batch QR code", { id: "batch-qr-gen" });
    }
  };

  // Bulk actions for visible codes
  const handleBulkZip = async () => {
    if (!visibleCodes.length) return;
    try {
      const loadId = toast.loading(`Exporting ${Math.min(visibleCodes.length, 100)} tags…`);
      await downloadTagsZip({
        batchNumber: filterBatch !== "all" ? filterBatch : "selection",
        productName: visibleCodes[0]?.productName || "Product",
        brandName: companyName,
        codes: visibleCodes.map((c) => c.codeString),
        style: tagStyle,
        onProgress: (cur, tot) => {
          toast.loading(`Exporting tags (${cur}/${tot})…`, { id: loadId });
        },
      });
      toast.success("Downloaded tags archive", { id: loadId });
    } catch (err) {
      console.error(err);
      toast.error("Bulk export failed");
    }
  };

  const handleBulkPrint = async () => {
    if (!visibleCodes.length) return;
    try {
      toast.loading("Generating printable sticker sheet…", { id: "bulk-print" });
      await printTagSheet({
        batchNumber: filterBatch !== "all" ? filterBatch : "bank",
        productName: visibleCodes[0]?.productName || "Product",
        brandName: companyName,
        codes: visibleCodes.map((c) => c.codeString),
        style: tagStyle,
      });
      toast.success("Print sheet ready!", { id: "bulk-print" });
    } catch (err) {
      console.error(err);
      toast.error("Print generation failed", { id: "bulk-print" });
    }
  };

  const chronologicalBatches = useMemo(() => {
    return [...(batches.data ?? [])].sort((a, b) => {
      return (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [batches.data]);

  const handleBatchTagsZip = async (
    batchId: string,
    batchNumber: string,
    productName: string,
    style: "rectangle" | "circle",
  ) => {
    try {
      const loadId = toast.loading(`Preparing tags for batch ${batchNumber}…`);
      const codeStrings = await listBatchCodeStrings(batchId);
      await downloadTagsZip({
        batchNumber,
        productName,
        brandName: companyName,
        codes: codeStrings,
        style,
        onProgress: (cur, tot) => {
          toast.loading(`Exporting tags (${cur}/${tot})…`, { id: loadId });
        },
      });
      toast.success(`Downloaded tags ZIP for ${batchNumber}`, { id: loadId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate tag zip");
    }
  };

  const handleBatchPrintSheet = async (
    batchId: string,
    batchNumber: string,
    productName: string,
    style: "rectangle" | "circle",
  ) => {
    try {
      toast.loading("Generating printable sticker sheet…", { id: "print-sheet" });
      const codeStrings = await listBatchCodeStrings(batchId);
      await printTagSheet({
        batchNumber,
        productName,
        brandName: companyName,
        codes: codeStrings,
        style,
      });
      toast.success("Print sheet ready!", { id: "print-sheet" });
    } catch (err) {
      console.error(err);
      toast.error("Failed to open print sheet", { id: "print-sheet" });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Tag Style Selector */}
      <div className="panel p-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-500/30">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-[#caa33a]" />
            <h3 className="font-semibold text-sm text-foreground">
              Dynamic Verification QR Codes & Security Stickers
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Select your preferred sticker format below to download or print directly onto adhesive
            product labels.
          </p>
        </div>

        {/* Tag Style Chooser: Rectangle vs Circle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setTagStyle("rectangle")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tagStyle === "rectangle"
                  ? "bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500/40 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <RectangleHorizontal className="size-3.5 text-[#caa33a]" />
              Rectangular Label
            </button>
            <button
              type="button"
              onClick={() => setTagStyle("circle")}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tagStyle === "circle"
                  ? "bg-amber-500/20 text-amber-950 dark:text-amber-200 border border-amber-500/40 shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CircleDot className="size-3.5 text-[#caa33a]" />
              Circular Tag
            </button>
          </div>

          {/* View Mode Toggle: Cards vs Table */}
          <div className="flex items-center rounded-lg border bg-background p-1 shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={`rounded-md p-1.5 transition ${
                viewMode === "cards"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Card Gallery View"
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`rounded-md p-1.5 transition ${
                viewMode === "table"
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Table View"
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/*                       BATCH HISTORY SECTION                               */}
      {/* ========================================================================= */}
      <div className="panel overflow-hidden border border-border shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-300">
              <History className="size-4 text-[#caa33a]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-foreground">Batch History</h3>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-primary">
                  {chronologicalBatches.length}{" "}
                  {chronologicalBatches.length === 1 ? "Batch" : "Batches"}
                </span>
                {filterBatch !== "all" && activeSelectedBatch && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-900 dark:text-amber-300 font-bold border border-amber-500/30">
                    Filtered: {activeSelectedBatch.batchNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Chronological list of all previously generated QR code batches with status and
                creation date.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {filterBatch !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterBatch("all")}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filter
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryExpanded((e) => !e)}
              className="h-8 gap-1.5 text-xs"
            >
              {historyExpanded ? (
                <>
                  <ChevronUp className="size-3.5" /> Collapse History
                </>
              ) : (
                <>
                  <ChevronDown className="size-3.5" /> Expand History ({chronologicalBatches.length}
                  )
                </>
              )}
            </Button>
          </div>
        </div>

        {historyExpanded && (
          <div>
            {batches.isLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                Loading batch history…
              </div>
            ) : !chronologicalBatches.length ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  No QR code batches generated yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Generated batches will appear here in chronological order with their status and
                  creation date.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/40 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                    <TableRow>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Batch Identifier</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chronologicalBatches.map((b: any) => {
                      const isSelected = filterBatch === b.id;
                      const dateObj = new Date(b.createdAt);
                      const formattedDate = dateObj.toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      });
                      const formattedTime = dateObj.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <TableRow
                          key={b.id}
                          className={`transition-colors ${
                            isSelected
                              ? "bg-amber-500/10 hover:bg-amber-500/15 border-l-4 border-l-[#caa33a]"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="size-3.5 text-muted-foreground" />
                              <span className="font-medium text-foreground">{formattedDate}</span>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                {formattedTime}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell className="font-mono text-xs font-semibold whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span>{b.batchNumber}</span>
                              {isSelected && (
                                <span className="rounded bg-primary/20 px-1.5 py-0.2 font-mono text-[9px] text-primary font-bold">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-xs font-medium max-w-[160px] truncate">
                            {b.productName ?? "—"}
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-mono font-medium ${
                                b.tagFormat === "circle"
                                  ? "bg-amber-500/15 text-amber-900 dark:text-amber-300 border border-amber-500/30"
                                  : "bg-muted text-muted-foreground border"
                              }`}
                            >
                              {b.tagFormat === "circle" ? "● Circular Tag" : "▬ Rect Label"}
                            </span>
                          </TableCell>

                          <TableCell className="text-right tabular-nums font-mono text-xs font-semibold">
                            {b.quantity.toLocaleString()}
                          </TableCell>

                          <TableCell>
                            <StatusBadge
                              status={b.status === "ready" ? "approved" : b.status || "approved"}
                            />
                          </TableCell>

                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilterBatch(isSelected ? "all" : b.id)}
                                className={`h-7 px-2 text-xs font-medium ${
                                  isSelected
                                    ? "bg-zinc-950 text-white hover:bg-black"
                                    : "hover:bg-accent"
                                }`}
                                title={
                                  isSelected
                                    ? "Showing codes from this batch"
                                    : "Filter Code Bank to this batch"
                                }
                              >
                                {isSelected ? (
                                  <>
                                    <Check className="size-3 mr-1" /> Selected
                                  </>
                                ) : (
                                  <>Filter Codes</>
                                )}
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  handleGenerateAndDisplayBatchQr(b.id, {
                                    productName: b.productName || "Product",
                                    batchNumber: b.batchNumber,
                                    productId: b.productId,
                                    quantity: b.quantity,
                                    brandName: companyName,
                                    tagFormat: b.tagFormat || "rectangle",
                                  })
                                }
                                className="h-7 px-2 text-xs border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/10"
                                title="Dynamic Batch QR code & download"
                              >
                                <QrCode className="size-3 text-[#caa33a] mr-1" /> QR
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleBatchTagsZip(
                                    b.id,
                                    b.batchNumber,
                                    b.productName || "Product",
                                    b.tagFormat || "rectangle",
                                  )
                                }
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                title="Download ZIP tags"
                              >
                                <Archive className="size-3 mr-1" /> ZIP
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleBatchPrintSheet(
                                    b.id,
                                    b.batchNumber,
                                    b.productName || "Product",
                                    b.tagFormat || "rectangle",
                                  )
                                }
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                title="Print adhesive sheet"
                              >
                                <Printer className="size-3 mr-1" /> Print
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="panel p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
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
              placeholder="ASM-XXXX-XXXXXX"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 font-mono text-xs"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant={flaggedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFlaggedOnly((f) => !f)}
            className="w-1/2 justify-center text-xs"
          >
            <Flag className="size-3.5 mr-1" />
            {flaggedOnly ? "Flagged" : "All codes"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const target = activeSelectedBatch || visibleBatches[0];
              if (target) {
                handleGenerateAndDisplayBatchQr(target.id, {
                  productName: target.productName || "Product",
                  batchNumber: target.batchNumber,
                  productId: target.productId,
                  quantity: target.quantity,
                  brandName: companyName,
                });
              } else {
                toast.info("Please select or create a batch first.");
              }
            }}
            className="w-1/2 justify-center text-xs border-amber-500/40 text-amber-900 dark:text-amber-300 hover:bg-amber-500/10"
            title="Generate & display dynamic QR code for batch"
          >
            <QrCode className="size-3.5 mr-1 text-[#caa33a]" /> Batch QR
          </Button>
        </div>

        {/* Bulk Action Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkPrint}
            disabled={!visibleCodes.length}
            className="w-1/2 justify-center text-xs"
            title="Print sheet of visible codes"
          >
            <Printer className="size-3.5 mr-1" /> Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkZip}
            disabled={!visibleCodes.length}
            className="w-1/2 justify-center text-xs"
            title="Download ZIP of visible tags"
          >
            <Archive className="size-3.5 mr-1" /> ZIP
          </Button>
        </div>
      </div>

      {/* Dynamic Batch QR Code Panel (displayed when a batch is filtered/selected) */}
      {activeSelectedBatch && (
        <BatchQrInlinePanel
          batchId={activeSelectedBatch.id}
          productInfo={{
            productName: activeSelectedBatch.productName || "Product",
            batchNumber: activeSelectedBatch.batchNumber,
            productId: activeSelectedBatch.productId,
            quantity: activeSelectedBatch.quantity,
            brandName: companyName,
          }}
          onOpenModal={() =>
            handleGenerateAndDisplayBatchQr(activeSelectedBatch.id, {
              productName: activeSelectedBatch.productName || "Product",
              batchNumber: activeSelectedBatch.batchNumber,
              productId: activeSelectedBatch.productId,
              quantity: activeSelectedBatch.quantity,
              brandName: companyName,
            })
          }
        />
      )}

      {/* Main Content: Gallery or Table */}
      <div className="panel overflow-hidden p-4">
        {codes.isLoading ? (
          <div className="h-96 animate-pulse" />
        ) : !visibleCodes.length ? (
          <div className="p-12">
            <EmptyState
              title="No verification codes found"
              description="Request your first batch to dynamically generate scannable verification codes and physical security tags."
            />
          </div>
        ) : viewMode === "cards" ? (
          /* ================= GALLERY CARDS VIEW ================= */
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Displaying <strong>{visibleCodes.length}</strong> dynamic verification tags
              </span>
              <span>
                Format:{" "}
                {tagStyle === "rectangle"
                  ? "Holographic Rectangular Seal"
                  : "Circular Tamper Badge"}
              </span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 place-items-center">
              {visibleCodes.map((c) => (
                <div
                  key={c.id}
                  className="rounded-2xl border bg-card p-4 shadow-xs transition-shadow hover:shadow-md flex flex-col items-center w-full max-w-[290px]"
                >
                  <div className="w-full flex items-center justify-between text-[11px] text-muted-foreground pb-2 mb-2 border-b">
                    <span className="truncate max-w-[140px] font-medium text-foreground">
                      {c.productName}
                    </span>
                    <span className="font-mono">{c.batchNumber}</span>
                  </div>

                  <ProductTagPreview
                    codeString={c.codeString}
                    productName={c.productName}
                    brandName={companyName}
                    batchNumber={c.batchNumber}
                    style={tagStyle}
                    size="sm"
                    showActions={true}
                  />

                  <div className="mt-3 w-full flex items-center justify-between text-[10px] text-muted-foreground pt-2 border-t">
                    <span>Scans: {c.scanCount || 0}</span>
                    <button
                      type="button"
                      onClick={() => setPreviewCode(c)}
                      className="text-primary hover:underline font-medium flex items-center gap-1"
                    >
                      <Eye className="size-3" /> Full Preview
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ================= DATA TABLE VIEW ================= */
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">QR Code</TableHead>
                  <TableHead>Code String</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Scans</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Download & Tag Preview</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleCodes.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <CodeQrThumbnail codeString={c.codeString} />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">
                      {c.codeString}
                      {c.flagged && (
                        <span className="ml-2 inline-flex align-middle">
                          <AlertTriangle className="size-3.5 text-invalid" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{c.productName ?? "—"}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">
                      {c.batchNumber ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-xs">
                      {(c.scanCount ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.flagged ? "escalated" : "approved"} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const b = batches.data?.find((x: any) => x.id === c.batchId);
                            handleGenerateAndDisplayBatchQr(c.batchId, {
                              productName: c.productName || "Product",
                              batchNumber: c.batchNumber,
                              productId: c.productId,
                              quantity: b?.quantity ?? 0,
                              brandName: companyName,
                            });
                          }}
                          className="h-8 gap-1 text-xs border border-transparent hover:border-amber-500/30"
                          title="Generate & download dynamic QR for this batch"
                        >
                          <QrCode className="size-3.5 text-[#caa33a]" /> Batch QR
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPreviewCode(c)}
                          className="h-8 gap-1.5 text-xs text-amber-900 dark:text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
                        >
                          <Sparkles className="size-3.5 text-[#caa33a]" /> Preview Tag
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Modal for detailed Tag Preview */}
      {previewCode && (
        <TagPreviewModal
          open={!!previewCode}
          onOpenChange={(open) => !open && setPreviewCode(null)}
          codeString={previewCode.codeString}
          productName={previewCode.productName}
          brandName={companyName}
          batchNumber={previewCode.batchNumber}
          defaultStyle={tagStyle}
        />
      )}

      {/* Modal for dynamically generated Batch QR code */}
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
    return <div className="size-8 rounded bg-muted animate-pulse" />;
  }

  return (
    <button
      type="button"
      onClick={() => downloadDataUrl(dataUrl, `qr-${codeString}.png`)}
      className="group relative size-8 overflow-hidden rounded border border-border p-0.5 hover:ring-2 hover:ring-primary transition"
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
