import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMyCompany, useSession, type Company, CATEGORIES } from "@/lib/auth";
import {
  countCodesForProduct,
  createProduct,
  deleteProduct,
  listProducts,
  setProductRecall,
  updateProduct,
  uploadProductImage,
  type Product,
} from "@/lib/db";
import { PageHeader, EmptyState, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  PackagePlus,
  Pencil,
  Trash2,
  Package,
  Upload,
  X,
  ImagePlus,
  ShieldAlert,
  RotateCcw,
  Loader2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef, useMemo } from "react";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — Asemi" }] }),
  component: ProductsPage,
});

type ProductWithCount = Product & {
  codes_count: number;
};

function isExpiredDate(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return false;
  const endOfDay = new Date(parsed);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay.getTime() < Date.now();
}

function ProductsPage() {
  const { data: session, isPending: sessionPending } = useSession();
  const {
    data: company,
    isPending: companyPending,
    isError: companyError,
  } = useMyCompany() as { data: Company | null | undefined; isPending: boolean; isError: boolean };
  const companyId = company?.id;
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithCount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductWithCount | null>(null);
  const [recallTarget, setRecallTarget] = useState<ProductWithCount | null>(null);
  const [recallReason, setRecallReason] = useState("");
  const [recallBusy, setRecallBusy] = useState(false);

  // NOTE: distinct key from ["products", companyId] (used across the app for
  // plain products) — the shapes differ (this adds codes_count) and sharing a
  // key crashes this page when the plain cache lands first.
  const products = useQuery({
    queryKey: ["products-with-counts", companyId],
    enabled: !!companyId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<ProductWithCount[]> => {
      const list = await listProducts(companyId!);
      return Promise.all(
        list.map(async (p) => ({
          ...p,
          codes_count: await countCodesForProduct(companyId!, p.id),
        })),
      );
    },
  });

  const filteredProducts = useMemo(() => {
    const all = products.data ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku ?? "").toLowerCase().includes(q) ||
        (p.category ?? "").toLowerCase().includes(q) ||
        (p.lotNumber ?? "").toLowerCase().includes(q),
    );
  }, [products.data, search]);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteProduct(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-with-counts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["products", companyId] });
      toast.success("Product deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Delete failed"),
  });

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(p: ProductWithCount) {
    setEditing(p);
    setDialogOpen(true);
  }

  function openRecallDialog(p: ProductWithCount) {
    setRecallTarget(p);
    setRecallReason(p.recallReason ?? "");
  }

  async function handleRecallSubmit(recalled: boolean) {
    if (!recallTarget || !companyId) return;
    setRecallBusy(true);
    try {
      await setProductRecall({
        productId: recallTarget.id,
        companyId,
        recalled,
        reason: recalled ? recallReason : null,
        product: recallTarget,
      });
      await queryClient.invalidateQueries({ queryKey: ["products-with-counts", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["products", companyId] });
      toast.success(
        recalled
          ? `Recall issued for ${recallTarget.name}`
          : `Recall lifted for ${recallTarget.name}`,
      );
      setRecallTarget(null);
      setRecallReason("");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not update recall status");
    } finally {
      setRecallBusy(false);
    }
  }

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Products"
        description="Manage your protected SKUs, default lot and shelf-life provenance, and product-wide recall notices."
        action={
          <Button
            onClick={openCreate}
            className="whitespace-nowrap shrink-0 bg-blue-600 hover:bg-blue-700"
          >
            <PackagePlus className="size-4" /> New product
          </Button>
        }
      />

      {sessionPending || companyPending || (!companyId && !companyError) ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      ) : !session || !companyId ? (
        <EmptyState
          title="Sign in required"
          description="Please sign in to manage your products."
        />
      ) : products.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      ) : products.isError ? (
        <EmptyState
          title="Couldn't load products"
          description={
            products.error instanceof Error ? products.error.message : "Failed to load products."
          }
          action={
            <Button onClick={() => products.refetch()} className="bg-blue-600 hover:bg-blue-700">
              Retry
            </Button>
          }
        />
      ) : !products.data?.length ? (
        <EmptyState
          title="No products yet"
          description="Add your first product SKU to start issuing serialized verification codes."
          action={
            <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
              <PackagePlus className="mr-2 size-4" /> Create your first product
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative min-w-[220px] flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by product name or SKU…"
                className="pl-9 pr-8 text-sm"
                aria-label="Search products by name or SKU"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <p className="text-xs font-medium text-slate-500 tabular-nums">
              {search.trim()
                ? `${filteredProducts.length.toLocaleString()} of ${products.data.length.toLocaleString()} products`
                : `${products.data.length.toLocaleString()} ${products.data.length === 1 ? "product" : "products"}`}
            </p>
          </div>

          {!filteredProducts.length ? (
            <EmptyState
              title="No matching products"
              description={`No products matched "${search.trim()}". Try another name, SKU, or lot number.`}
              action={
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((p) => {
                const expired = isExpiredDate(p.expiryDate);
                const lotMetaLine = [
                  p.lotNumber ? `Lot ${p.lotNumber}` : null,
                  p.mfgDate ? `Mfg ${new Date(p.mfgDate).toLocaleDateString()}` : null,
                  p.expiryDate ? `Exp ${new Date(p.expiryDate).toLocaleDateString()}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div
                    key={p.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                      {p.imageUrls?.length ? (
                        <img
                          src={p.imageUrls[0]}
                          alt={p.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="size-16 text-slate-300" />
                        </div>
                      )}
                      {p.imageUrls && p.imageUrls.length > 1 && (
                        <span className="absolute right-2 top-2 rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-700 backdrop-blur tabular-nums">
                          +{p.imageUrls.length - 1}
                        </span>
                      )}
                    </div>
                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-sans text-base font-semibold leading-tight text-slate-900">
                            {p.name}
                          </h3>
                          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-slate-500">
                            <span
                              className={
                                p.sku ? "font-mono font-semibold text-blue-700" : "text-slate-400"
                              }
                            >
                              {p.sku ? `SKU ${p.sku}` : "No SKU"}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>{p.category}</span>
                            {p.regulatoryNumber ? (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">Reg {p.regulatoryNumber}</span>
                              </>
                            ) : null}
                          </p>
                        </div>
                        {p.recalled && <StatusBadge status="escalated" />}
                      </div>

                      {lotMetaLine ? (
                        <p className="truncate font-mono text-[11px] text-slate-500 tabular-nums">
                          {lotMetaLine}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400">
                          No default lot or shelf-life dates
                        </p>
                      )}

                      {p.recalled && (
                        <p className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800">
                          <strong className="font-semibold">Recalled:</strong>{" "}
                          {p.recallReason || "Active product recall advisory."}
                        </p>
                      )}

                      {!p.recalled && expired && (
                        <p className="text-xs font-medium text-red-600">
                          Default expiry date has passed — update SKU defaults or batch dates.
                        </p>
                      )}

                      <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={(p.codes_count ?? 0) > 0 ? "ready" : "none"} />
                          <span className="text-xs text-slate-500 tabular-nums">
                            {(p.codes_count ?? 0).toLocaleString()} codes
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openRecallDialog(p)}
                            aria-label={p.recalled ? "Manage product recall" : "Recall product"}
                            title={p.recalled ? "Manage recall" : "Issue product recall"}
                            className={
                              p.recalled
                                ? "text-red-600 hover:bg-red-50"
                                : "text-slate-500 hover:text-red-600"
                            }
                          >
                            {p.recalled ? (
                              <RotateCcw className="size-4" />
                            ) : (
                              <ShieldAlert className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(p)}
                            aria-label="Edit product"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <AlertDialog
                            open={deleteTarget?.id === p.id}
                            onOpenChange={(o) => !o && setDeleteTarget(null)}
                          >
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                onClick={() => setDeleteTarget(p)}
                                aria-label="Delete product"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently remove <strong>{p.name}</strong> and its
                                  associated {(p.codes_count ?? 0).toLocaleString()} codes. Scans
                                  and batches linked to this product will also be affected. This
                                  action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deleteMutation.mutate(p.id)}
                                  disabled={deleteMutation.isPending}
                                >
                                  {deleteMutation.isPending ? "Deleting…" : "Delete product"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        companyId={companyId}
      />

      {recallTarget && (
        <Dialog
          open={!!recallTarget}
          onOpenChange={(open) => !open && !recallBusy && setRecallTarget(null)}
        >
          <DialogContent className="max-w-md font-sans">
            <DialogHeader>
              <DialogTitle>
                {recallTarget.recalled
                  ? `Manage recall — ${recallTarget.name}`
                  : `Recall SKU — ${recallTarget.name}`}
              </DialogTitle>
              <DialogDescription>
                {recallTarget.recalled
                  ? "All verification certificates for this SKU currently show an urgent recall notice. You can update the message or lift the recall."
                  : "All batches and unit codes linked to this product SKU will immediately display a high-priority recall notice to scanning consumers."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="prod-recall-reason">Consumer advisory message</Label>
                <Textarea
                  id="prod-recall-reason"
                  rows={3}
                  placeholder="e.g. Discontinue use immediately and contact customer care for replacement."
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
                  "Update notice"
                ) : (
                  "Confirm SKU recall"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  editing,
  companyId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: ProductWithCount | null;
  companyId: string | undefined;
}) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0] ?? "");
  const [description, setDescription] = useState("");
  const [sku, setSku] = useState("");
  const [regulatoryNumber, setRegulatoryNumber] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setName("");
    setCategory(CATEGORIES[0] ?? "");
    setDescription("");
    setSku("");
    setRegulatoryNumber("");
    setLotNumber("");
    setMfgDate("");
    setExpiryDate("");
    setImages([]);
    setUploading(false);
    setSaving(false);
  }

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name ?? "");
      setCategory(editing.category ?? CATEGORIES[0] ?? "");
      setDescription(editing.description ?? "");
      setSku(editing.sku ?? "");
      setRegulatoryNumber(editing.regulatoryNumber ?? "");
      setLotNumber(editing.lotNumber ?? "");
      setMfgDate(editing.mfgDate ?? "");
      setExpiryDate(editing.expiryDate ?? "");
      setImages(editing.imageUrls ?? []);
      setUploading(false);
      setSaving(false);
    } else {
      resetForm();
    }
  }, [open, editing]);

  const invalidDateRange = Boolean(mfgDate && expiryDate && expiryDate < mfgDate);

  async function handleImageFiles(files: FileList | null) {
    if (!files || !companyId) return;
    const newImages = [...images];

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        newImages.push(await uploadProductImage(companyId, file));
      }
      setImages(newImages);
      toast.success(`${files.length} image${files.length > 1 ? "s" : ""} uploaded`);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setImages(images.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !name.trim()) return;
    if (invalidDateRange) {
      toast.error("Expiry date cannot precede the manufacture date.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category,
        description: description.trim(),
        sku: sku.trim(),
        imageUrls: images,
        regulatoryNumber: regulatoryNumber.trim() || null,
        lotNumber: lotNumber.trim() || null,
        mfgDate: mfgDate || null,
        expiryDate: expiryDate || null,
      };
      if (editing) {
        await updateProduct(editing.id, payload);
        toast.success("Product updated");
      } else {
        await createProduct(companyId, payload);
        toast.success("Product created");
      }
      queryClient.invalidateQueries({ queryKey: ["products-with-counts", companyId] });
      queryClient.invalidateQueries({ queryKey: ["products", companyId] });
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-name">Product name *</Label>
              <Input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Botanical Repair Serum 50ml"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-cat">Category *</Label>
              <Select value={category} onValueChange={(value) => setCategory(value ?? "")}>
                <SelectTrigger id="p-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-sku">SKU</Label>
              <Input
                id="p-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. BRS-0050"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-desc">Description (optional)</Label>
              <Textarea
                id="p-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Short description shown on the consumer authentication certificate."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Images</Label>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
              {images.map((url, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-md border"
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute inset-0 grid place-items-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="size-5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-muted-foreground transition hover:bg-accent/50 disabled:opacity-50"
              >
                {uploading ? (
                  <Upload className="size-5 animate-bounce" />
                ) : (
                  <ImagePlus className="size-5" />
                )}
                <span className="text-[10px]">{uploading ? "…" : "Add"}</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  handleImageFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Upload up to 10 product photographs for visual consumer inspection.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-regno">Regulatory approval no. (optional)</Label>
              <Input
                id="p-regno"
                value={regulatoryNumber}
                onChange={(e) => setRegulatoryNumber(e.target.value)}
                placeholder="e.g. FDA, CE, NAFDAC no."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-lot">Default lot number (optional)</Label>
              <Input
                id="p-lot"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="e.g. LOT-2026-1042"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-mfg">Default manufacture date (optional)</Label>
              <Input
                id="p-mfg"
                type="date"
                value={mfgDate}
                onChange={(e) => setMfgDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-exp">Default expiry date (optional)</Label>
              <Input
                id="p-exp"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>
          {invalidDateRange && (
            <p className="text-xs font-medium text-red-600">
              Expiry date must be on or after the manufacture date.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || uploading || invalidDateRange}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving
                ? editing
                  ? "Saving…"
                  : "Creating…"
                : editing
                  ? "Save changes"
                  : "Create product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
