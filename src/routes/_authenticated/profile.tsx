import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useMyCompany, useSession, useSignOut, CATEGORIES, type Company } from "@/lib/auth";
import {
  countCollection,
  updateCompanySelfService,
  uploadCompanyDoc,
  uploadProductImage,
} from "@/lib/db";
import { PageHeader, StatCard, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  Upload,
  FileCheck,
  UserCircle2,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  Info,
  Package,
  FileCode,
  Gift,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Asemi" }] }),
  component: ProfilePage,
});

type ExtendedCompany = Company;

function ProfilePage() {
  const { data: session } = useSession();
  const { data: company } = useMyCompany() as { data: ExtendedCompany | null | undefined };
  const signOut = useSignOut();
  const queryClient = useQueryClient();
  const companyId = company?.id;

  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0] ?? "");
  const [logo, setLogo] = useState<File | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (company) {
      setName(company.name ?? "");
      setRegistrationNumber(company.registrationNumber ?? "");
      setAddress(company.address ?? "");
      setPhone(company.phone ?? "");
      setEmail(company.email ?? "");
      setCategory(company.category ?? CATEGORIES[0] ?? "");
      setLogoPreview(company.logoUrl ?? null);
    }
  }, [company]);

  const productCount = useQuery({
    queryKey: ["profile-product-count", companyId],
    enabled: !!companyId,
    queryFn: () => countCollection("products", companyId!),
  });

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!companyId) return;
    setBusy(true);
    try {
      let logoUrl: string | undefined;
      let docUrl: string | undefined;

      if (logo) {
        try {
          logoUrl = await uploadProductImage(companyId, logo);
          setLogoPreview(logoUrl);
        } catch (uploadErr) {
          console.warn("Logo upload failed:", uploadErr);
        }
      }
      if (document) {
        try {
          docUrl = await uploadCompanyDoc(companyId, document);
        } catch (uploadErr) {
          console.warn("Document upload failed:", uploadErr);
        }
      }

      await updateCompanySelfService(companyId, {
        name,
        registrationNumber,
        address,
        phone,
        email,
        category,
        ...(logoUrl !== undefined ? { logoUrl } : {}),
        ...(docUrl !== undefined ? { documentUrl: docUrl } : {}),
      });

      await queryClient.invalidateQueries({ queryKey: ["my-company", session?.user.id] });
      setLogo(null);
      setDocument(null);
      toast.success("Company details saved.");
      if (docUrl !== undefined) {
        toast.message("Document updated — an admin will re-review your registration.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const totalCodes = company?.totalCodesGenerated ?? 0;
  const freeUsed = company?.freeCodesUsed ?? 0;
  const freeRemain = Math.max(0, 20 - freeUsed);
  const totalProducts = productCount.data ?? 0;

  const statusStyle =
    company?.status === "approved"
      ? "border-genuine/30 bg-genuine/5"
      : company?.status === "rejected"
        ? "border-invalid/30 bg-invalid/5"
        : company?.status === "needs_info"
          ? "border-cyan/30 bg-cyan/5"
          : "border-caution/30 bg-caution/5";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company profile"
        description="Update your business information, registration documents, and logo."
      />

      {company && (
        <div className={cn("panel p-6 border", statusStyle)}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid size-11 place-items-center rounded-xl bg-card">
                {company.status === "approved" ? (
                  <ShieldCheck className="size-5 text-genuine" />
                ) : company.status === "rejected" ? (
                  <ShieldAlert className="size-5 text-invalid" />
                ) : (
                  <Info className="size-5 text-caution-foreground" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-semibold tracking-tight">
                    Approval status
                  </h2>
                  <StatusBadge status={company.status} />
                </div>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  {company.status === "approved" &&
                    "Your company is verified. You can generate paid batches of codes now."}
                  {company.status === "pending" &&
                    "Your registration is being reviewed by a human. This usually takes 1–2 business days."}
                  {company.status === "needs_info" &&
                    "Please review the admin note, update your documents, and save to re-submit."}
                  {company.status === "rejected" &&
                    "Your registration was not approved. Review the note, update your information, and save to re-apply."}
                </p>
              </div>
            </div>
          </div>
          {company.adminNote && (
            <div className="mt-4 rounded-lg border bg-background p-4 text-sm">
              <p className="eyebrow">Note from Asemi admin</p>
              <p className="mt-1 whitespace-pre-wrap">{company.adminNote}</p>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Codes generated"
          value={totalCodes.toLocaleString()}
          icon={<FileCode className="size-4" />}
        />
        <StatCard
          label="Free codes used"
          value={`${freeUsed} / 20`}
          hint={`${freeRemain} free codes remaining`}
          icon={<Gift className="size-4" />}
        />
        <StatCard
          label="Products listed"
          value={totalProducts.toLocaleString()}
          icon={<Package className="size-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="size-4" /> Company details
            </CardTitle>
            <CardDescription>
              This information appears on your public product verification pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Company / brand name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="category">Business category</Label>
                  <Select value={category} onValueChange={(value) => setCategory(value ?? "")}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
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
                  <Label htmlFor="regno">CAC / Business registration number</Label>
                  <Input
                    id="regno"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="address">Registered address</Label>
                  <Textarea
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    required
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label htmlFor="email">Work email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 border-t pt-5">
                <div className="space-y-2">
                  <Label>Brand logo (optional)</Label>
                  <div className="flex items-center gap-4 rounded-xl border p-3">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo"
                        className="size-16 rounded-lg border object-cover"
                      />
                    ) : (
                      <div className="grid size-16 place-items-center rounded-lg border bg-muted/40 text-muted-foreground">
                        <Building2 className="size-6" />
                      </div>
                    )}
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="logo-input"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        <Upload className="size-3.5" />
                        {logo ? logo.name : logoPreview ? "Replace logo" : "Upload logo"}
                      </Label>
                      <input
                        id="logo-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Square PNG / JPEG, 512×512 recommended
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Registration document</Label>
                  <div className="flex items-center gap-4 rounded-xl border p-3">
                    <div
                      className={cn(
                        "grid size-16 place-items-center rounded-lg border",
                        company?.documentUrl
                          ? "bg-genuine/10 text-genuine"
                          : "bg-muted/40 text-muted-foreground",
                      )}
                    >
                      <FileCheck className="size-6" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label
                        htmlFor="doc-input"
                        className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent"
                      >
                        <Upload className="size-3.5" />
                        {document
                          ? document.name
                          : company?.documentUrl
                            ? "Re-upload document"
                            : "Upload document"}
                      </Label>
                      <input
                        id="doc-input"
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Image or PDF. Re-uploading triggers a re-review.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!company) return;
                    setName(company.name ?? "");
                    setRegistrationNumber(company.registrationNumber ?? "");
                    setAddress(company.address ?? "");
                    setPhone(company.phone ?? "");
                    setEmail(company.email ?? "");
                    setCategory(company.category ?? "");
                    setLogo(null);
                    setDocument(null);
                    setLogoPreview(company.logoUrl ?? null);
                  }}
                  disabled={busy}
                >
                  Reset
                </Button>
                <Button type="submit" disabled={busy}>
                  <Save className="mr-2 size-4" />
                  {busy ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserCircle2 className="size-4" /> Signed in as
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-full border bg-muted/40">
                  <span className="text-sm font-semibold">
                    {session?.user.email?.[0]?.toUpperCase() ?? "A"}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium">{session?.user.email}</p>
                  <p className="text-xs text-muted-foreground">Account owner</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3 text-xs">
                <Info className="size-3.5 shrink-0 text-muted-foreground" />
                <p className="text-muted-foreground">
                  The first user to register this company owns the account. Contact support to
                  change ownership.
                </p>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (confirm("Sign out of Asemi?")) signOut();
                }}
              >
                <LogOut className="mr-2 size-4" />
                Sign out
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Need help?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                If your application was rejected or you need information about billing, reach an
                Asemi admin through the support channels on the public website.
              </p>
              <p className="text-xs">
                Approved companies receive 20 free verification codes to try the service before
                topping up.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Info className="size-4" /> Universal Access
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed">
              <p>
                Product authentication and counterfeit defense is open to all brands. Official
                business incorporation documents and tax IDs are strictly optional — small
                businesses, artisanal makers, and independent brands can register and mint
                verification tags immediately.
              </p>
              <p className="mt-2">
                Regulatory certificates (such as FDA, CE, NAFDAC, or ISO) and Lab CoAs can be added
                per product or batch inside your console.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
