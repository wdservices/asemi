/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fb as supabase } from "@/integrations/firebase/client";
import { useMyCompany, type Company, CATEGORIES } from "@/lib/auth";
import { PageHeader, EmptyState, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import type { Tables, Database } from "@/integrations/firebase/types";
import { PackagePlus, Pencil, Trash2, Package, Upload, X, ImagePlus, Hash } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef } from "react";

export const Route = createFileRoute("/_authenticated/products")({
  head: () => ({ meta: [{ title: "Products — Asemi" }] }),
  component: ProductsPage,
});

type ProductWithCount = Tables<"products"> & {
  codes_count: number;
};

function ProductsPage() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProductWithCount | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductWithCount | null>(null);

  const products = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          `
          *,
          codes:codes(count)
        `,
        )
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map(
        (p: any) =>
          ({
            ...p,
            codes_count:
              ((p as unknown as { codes?: { count: number }[] }).codes?.[0]?.count as number) ?? 0,
          }) as ProductWithCount,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage the products you protect with Asemi verification codes."
        action={
          <Button onClick={openCreate}>
            <PackagePlus className="size-4" /> New product
          </Button>
        }
      />

      {products.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="panel h-64 animate-pulse p-5" />
          ))}
        </div>
      ) : !products.data?.length ? (
        <EmptyState
          title="No products yet"
          description="Add your first product to start generating verification codes."
          action={
            <Button onClick={openCreate}>
              <PackagePlus className="mr-2 size-4" /> Create your first product
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {products.data.map((p: any) => (
            <div key={p.id} className="panel overflow-hidden transition hover:shadow-md">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-secondary">
                {(p as any).images?.length ? (
                  <img
                    src={(p as any).images[0]}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Package className="size-16 text-muted-foreground/40" />
                  </div>
                )}
                {(p as any).images?.length > 1 && (
                  <span className="absolute right-2 top-2 rounded-md bg-background/90 px-2 py-0.5 text-xs font-medium backdrop-blur">
                    +{(p as any).images.length - 1}
                  </span>
                )}
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold leading-tight truncate">
                      {p.name}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.category}</p>
                  </div>
                </div>
                {p.sku && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Hash className="size-3" />
                    <span className="font-mono">{p.sku}</span>
                  </div>
                )}
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={p.codes_count > 0 ? "ready" : "none"} />
                    <span className="text-xs text-muted-foreground">
                      {p.codes_count.toLocaleString()} codes
                    </span>
                  </div>
                  <div className="flex gap-1">
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
                          className="text-invalid hover:text-invalid"
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
                            associated {p.codes_count.toLocaleString()} codes. Scans and batches
                            linked to this product will also be deleted. This action cannot be
                            undone.
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
          ))}
        </div>
      )}

      <ProductDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        companyId={companyId}
      />
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
  const [specsText, setSpecsText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [specsError, setSpecsError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function resetForm() {
    setName("");
    setCategory(CATEGORIES[0] ?? "");
    setDescription("");
    setSku("");
    setSpecsText("");
    setImages([]);
    setUploading(false);
    setSpecsError(null);
    setSaving(false);
  }

  function populateFromEdit() {
    if (editing) {
      setName(editing.name);
      setCategory(editing.category ?? "");
      setDescription(editing.description ?? "");
      setSku(editing.sku ?? "");
      setSpecsText(editing.specs ? JSON.stringify(editing.specs, null, 2) : "{\n  \n}");
      setImages((editing as any).images ?? []);
    } else {
      resetForm();
    }
  }

  function handleOpenChange(o: boolean) {
    if (!o) {
      onOpenChange(false);
      return;
    }
    populateFromEdit();
    onOpenChange(true);
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files || !companyId) return;
    const productFolder = editing?.id ?? `temp-${Date.now()}`;
    const newImages = [...images];

    setUploading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file) continue;
        const ext = file.name.split(".").pop() ?? "png";
        const random = Math.random().toString(36).slice(2, 8);
        const key = `${companyId}/products/${productFolder}/img-${Date.now()}-${random}.${ext}`;

        const { error } = await supabase.storage
          .from("product-images")
          .upload(key, file, { upsert: true });
        if (error) throw error;

        const { data } = supabase.storage.from("product-images").getPublicUrl(key);
        newImages.push(data.publicUrl);
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

  function parseSpecs(): {
    specs: Record<string, unknown> | null;
    error: string | null;
  } {
    const trimmed = specsText.trim();
    if (!trimmed) return { specs: {}, error: null };
    try {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { specs: null, error: "Specs must be a JSON object" };
      }
      return { specs: parsed as Record<string, unknown>, error: null };
    } catch {
      return { specs: null, error: "Invalid JSON" };
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId || !name.trim()) return;

    const { specs, error: specErr } = parseSpecs();
    if (specErr) {
      setSpecsError(specErr);
      return;
    }
    setSpecsError(null);

    setSaving(true);
    try {
      if (editing) {
        const { error } = await supabase
          .from("products")
          .update({
            name: name.trim(),
            category,
            description: description.trim(),
            sku: sku.trim(),
            specs: specs as unknown as any,
            images,
          })
          .eq("id", editing.id);
        if (error) throw error;
        toast.success("Product updated");
      } else {
        const { data, error } = await supabase
          .from("products")
          .insert({
            company_id: companyId,
            name: name.trim(),
            category,
            description: description.trim(),
            sku: sku.trim(),
            specs: specs as unknown as any,
            images,
          })
          .select()
          .single();
        if (error) throw error;
        toast.success("Product created");
      }
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="p-name">Product name *</Label>
              <Input
                id="p-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Herbal Mouthwash 250ml"
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
              <Label htmlFor="p-sku">SKU (optional)</Label>
              <Input
                id="p-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. HMW-0250"
              />
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="p-desc">Description (optional)</Label>
              <Textarea
                id="p-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Short description that appears on the public verification page."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Images</Label>
            <div className="grid gap-2 grid-cols-4 sm:grid-cols-5">
              {images.map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-square overflow-hidden rounded-md border group"
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
                className="aspect-square rounded-md border border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-accent/50 transition disabled:opacity-50"
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
              Upload up to 10 images. Stored in your product-images bucket.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-specs">
              Specs (optional JSON)
              <span className="ml-2 font-normal text-xs text-muted-foreground">
                Displayed on the public verification page
              </span>
            </Label>
            <Textarea
              id="p-specs"
              value={specsText}
              onChange={(e) => {
                setSpecsText(e.target.value);
                if (specsError) setSpecsError(null);
              }}
              rows={6}
              className="font-mono text-xs"
              placeholder={`{\n  "Volume": "250ml",\n  "Ingredients": "Xylitol, Mint"\n}`}
            />
            {specsError ? (
              <p className="text-xs text-invalid">{specsError}</p>
            ) : specsText.trim() ? (
              (() => {
                const { error } = parseSpecs();
                if (error) return <p className="text-xs text-invalid">{error}</p>;
                return <p className="text-xs text-genuine">Valid JSON object</p>;
              })()
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || uploading}>
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
