/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  CircleDot,
  RectangleHorizontal,
  LayoutGrid,
  List,
  Archive,
  ArrowRight,
  Check,
  History,
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

const QUERY_OPTS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

function BatchesPage() {
  const [activeTab, setActiveTab] = useState("request");

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Batches & Codes"
        description="Generate verification codes, track batches, and export QR labels — all in one place."
      />

      {/* Simple 3-step guide */}
      <div className="grid gap-3 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-white p-4 sm:grid-cols-3">
        {[
          { n: "1", t: "Choose product", d: "Pick what you're packaging" },
          { n: "2", t: "Set quantity", d: "Volume discounts apply" },
          { n: "3", t: "Pay & generate", d: "QR codes in seconds" },
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
    ...QUERY_OPTS,
    queryFn: () => listProducts(companyId!),
  });

  const qty = Math.max(0, quantity | 0);
  const pricing: ClientCalculatePriceResult = useMemo(() => {
    return calculateBatchPrice(qty, company?.countryCode || "NG");
  }, [qty, company?.countryCode]);

  const selectedProduct = products.data?.find((p: any) => p.id === productId);

  async function handleAuthorizePayment(
    onProgress: (p: number) => void,
    payment: { reference: string; verified: boolean },
  ) {
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
      paymentReference: payment.reference,
      paymentVerified: payment.verified,
      onProgress,
    });

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

    toast.success(`Batch ${res.batchNumber} ready — ${res.quantity.toLocaleString()} codes!`);
  }

  function resetForm() {
    setResult(null);
    setQuantity(100);
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

  if (result) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <div className="grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="mt-4 font-sans text-2xl font-bold tracking-tight">
            Batch {result.batch_number} ready
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {result.qty.toLocaleString()} codes created for{" "}
            <span className="font-semibold text-slate-900">{result.product_name}</span> (
            {result.tagFormat === "circle" ? "Circular tags" : "Rectangular labels"}).
          </p>

          <div className="mt-6 grid w-full gap-3 sm:grid-cols-2">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={onGoToBank}>
              <QrCode className="size-4" /> View codes <ArrowRight className="size-4" />
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
            >
              <Archive className="size-4" /> Download labels (ZIP)
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
            >
              <Printer className="size-4" /> Print sheet
            </Button>
            <Button
              variant="outline"
              onClick={() => exportCsvForBatch(result.batch_id, result.batch_number, result.qty)}
            >
              <Download className="size-4" /> Export CSV
            </Button>
          </div>

          <Button variant="ghost" className="mt-4 text-xs text-blue-700" onClick={resetForm}>
            Request another batch →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      {/* Form */}
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            New batch
          </p>
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
            Instant generation
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
        </div>

        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label htmlFor="rb-qty">Quantity *</Label>
            <div className="flex flex-wrap gap-1">
              {[50, 100, 500, 1000, 5000].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuantity(q)}
                  className={`rounded-lg border px-2 py-0.5 text-xs font-medium transition ${
                    quantity === q
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 hover:border-blue-300 hover:bg-blue-50"
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
            className="font-sans"
          />
          <p className="text-xs text-slate-400">Min 1 code. Volume discounts apply automatically.</p>
        </div>

        {/* Format picker — simple 2 options */}
        <div className="space-y-2.5">
          <Label className="text-sm font-semibold">Label format *</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setTagFormat("rectangle")}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition ${
                tagFormat === "rectangle"
                  ? "border-blue-600 bg-blue-50/60"
                  : "border-slate-200 hover:border-blue-300"
              }`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600/10 text-blue-700">
                <RectangleHorizontal className="size-5" />
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  Rectangular
                  {tagFormat === "rectangle" && <Check className="size-3.5 text-blue-600" />}
                </span>
                <span className="text-xs text-slate-500">50×25mm sticker · boxes & cartons</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTagFormat("circle")}
              className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition ${
                tagFormat === "circle"
                  ? "border-blue-600 bg-blue-50/60"
                  : "border-slate-200 hover:border-blue-300"
              }`}
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-600/10 text-blue-700">
                <CircleDot className="size-5" />
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  Circular
                  {tagFormat === "circle" && <Check className="size-3.5 text-blue-600" />}
                </span>
                <span className="text-xs text-slate-500">30mm seal · caps & jars</span>
              </span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-sm text-slate-500">
            Total:{" "}
            <strong className="text-slate-900">
              {formatMoney(pricing.price, pricing.currency)}
            </strong>{" "}
            <span className="text-xs">for {qty.toLocaleString()} codes</span>
          </p>
          <Button
            onClick={() => setPaymentModalOpen(true)}
            disabled={!productId || quantity <= 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <FileCode className="size-4" /> Continue to payment
          </Button>
        </div>
      </div>

      {/* Pricing summary */}
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Price estimate
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-sans text-4xl font-bold tracking-tight">
              {formatMoney(pricing.price, pricing.currency)}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {(pricing.price / Math.max(1, qty)).toFixed(2)} {pricing.currency} per code · Labels
            included free
          </p>
        </div>

        <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <p className="font-semibold text-slate-700">Volume discounts</p>
          <p>1 – 5,000: standard rate</p>
          <p>5,001 – 20,000: 20% off</p>
          <p>20,001 – 100,000: 40% off</p>
          <p>100,001+: up to 76% off</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
            Live preview — {tagFormat === "circle" ? "Circular" : "Rectangular"}
          </p>
          <div className="flex justify-center py-3">
            <ProductTagPreview
              codeString="ASM-SAMPLE-CODE"
              productName={selectedProduct?.name || "Your product"}
              brandName={companyName}
              batchNumber="SAMPLE"
              style={tagFormat}
              showActions={false}
              size="sm"
            />
          </div>
        </div>
      </div>

      {selectedProduct && (
        <PaymentGatewayModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          productName={selectedProduct.name}
          quantity={qty}
          amount={pricing.price}
          currency={pricing.currency}
          email={company?.email || ""}
          companyId={companyId || ""}
          productId={productId}
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
    ...QUERY_OPTS,
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
      const loadId = toast.loading(`Preparing labels for ${batchNumber}…`);
      const codeStrings = await listBatchCodeStrings(batchId);
      await downloadTagsZip({
        batchNumber,
        productName,
        brandName: companyName,
        codes: codeStrings,
        style,
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
    style: "rectangle" | "circle",
  ) {
    try {
      toast.loading("Generating print sheet…", { id: "print-sheet" });
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
            batches.data.reduce((s, b) => s + (b.amountCharged ?? 0), 0),
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
                <TableHead>Format</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Charged</TableHead>
                <TableHead className="text-right">Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {batches.data.map((b) => (
                <TableRow key={b.id} className="hover:bg-slate-50/60">
                  <TableCell className="font-mono text-xs font-semibold text-blue-700">
                    {b.batchNumber}
                  </TableCell>
                  <TableCell className="max-w-40 truncate">{b.productName ?? "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {b.tagFormat === "circle" ? "Circular" : "Rectangular"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {b.quantity.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMoney(b.amountCharged ?? 0, b.currency)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-xs text-slate-400">
                    {new Date(b.createdAt).toLocaleDateString()}
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
                            batchNumber: b.batchNumber,
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
                        onClick={() => exportCsvForBatch(b.id, b.batchNumber, b.quantity)}
                        className="h-8 text-xs"
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
                Download high-resolution labels (ZIP) or open a printable sheet.
              </p>
              {(
                [
                  { style: "rectangle" as const, t: "Rectangular labels", d: "50×25mm stickers" },
                  { style: "circle" as const, t: "Circular tags", d: "30mm seals" },
                ]
              ).map((opt) => (
                <div
                  key={opt.style}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
                >
                  <div>
                    <p className="text-sm font-semibold">{opt.t}</p>
                    <p className="text-xs text-slate-500">{opt.d}</p>
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
                          opt.style,
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
                          opt.style,
                        )
                      }
                      className="h-8 bg-blue-600 text-xs hover:bg-blue-700"
                    >
                      <Archive className="mr-1 size-3.5" /> ZIP
                    </Button>
                  </div>
                </div>
              ))}
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

  const [tagStyle, setTagStyle] = useState<"rectangle" | "circle">("rectangle");
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

  useEffect(() => {
    if (activeSelectedBatch?.tagFormat) {
      setTagStyle(activeSelectedBatch.tagFormat);
    }
  }, [activeSelectedBatch?.tagFormat]);

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
      await downloadTagsZip({
        batchNumber: filterBatch !== "all" ? filterBatch : "selection",
        productName: visibleCodes[0]?.productName || "Product",
        brandName: companyName,
        codes: visibleCodes.slice(0, 100).map((c) => c.codeString),
        style: tagStyle,
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
      await printTagSheet({
        batchNumber: filterBatch !== "all" ? filterBatch : "bank",
        productName: visibleCodes[0]?.productName || "Product",
        brandName: companyName,
        codes: visibleCodes.slice(0, 100).map((c) => c.codeString),
        style: tagStyle,
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
            Search, filter, and export any code. Showing up to 200 at a time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setTagStyle("rectangle")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tagStyle === "rectangle" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"
              }`}
            >
              Rectangular
            </button>
            <button
              type="button"
              onClick={() => setTagStyle("circle")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                tagStyle === "circle" ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"
              }`}
            >
              Circular
            </button>
          </div>
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
              ({tagStyle === "rectangle" ? "Rectangular" : "Circular"})
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
                    style={tagStyle}
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
          defaultStyle={tagStyle}
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
