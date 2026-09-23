import {
  Link,
  Outlet,
  createFileRoute,
  useRouter,
  useNavigate,
  useLocation,
} from "@tanstack/react-router";
import { getCurrentUserId } from "@/lib/auth";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  Receipt,
  UserCircle2,
  Settings,
  LogOut,
  ShieldAlert,
  Building2,
  FlagTriangleLeft,
  Inbox,
  ChevronRight,
  Menu,
  X,
  Wallet,
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand";
import { useIsAdmin, useMyCompany, useSession, useSignOut } from "@/lib/auth";
import { CountrySelectDropdown } from "@/components/asemi/AuthDropdowns";
import { createCompany, uploadCompanyDoc, uploadProductImage } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const userId = await getCurrentUserId();
    if (!userId) throw redirect({ to: "/auth" });
    return { userId };
  },
  component: DashboardShell,
});

import { redirect } from "@tanstack/react-router";

function DashboardShell() {
  const { data: session } = useSession();
  const { data: company } = useMyCompany();
  const { data: isAdmin } = useIsAdmin();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const needsOnboarding = !company || company.status === undefined;
  const showPending =
    company &&
    (company.status === "pending" ||
      company.status === "needs_info" ||
      company.status === "rejected");
  const location = useLocation();
  const currentPath = location.pathname;
  const isProfileRoute = currentPath === "/profile" || currentPath.startsWith("/profile");

  const companyNav = [
    { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
    { label: "Products", to: "/products", icon: Package },
    { label: "Batches & Codes", to: "/batches", icon: Receipt },
    { label: "Analytics", to: "/analytics", icon: BarChart3 },
    { label: "Billing", to: "/billing", icon: Wallet },
    { label: "Profile", to: "/profile", icon: UserCircle2 },
  ];

  const adminNav = [
    { label: "Approvals", to: "/admin", icon: ShieldAlert },
    { label: "Companies", to: "/admin/companies", icon: Building2 },
    { label: "Fraud review", to: "/admin/fraud", icon: FlagTriangleLeft },
    { label: "Reports inbox", to: "/admin/reports", icon: Inbox },
  ];

  return (
    <div className="ambient-bg min-h-screen">
      <div className="flex min-h-screen">
        {/* Sidebar desktop */}
        <aside className="no-print sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 lg:flex">
          <Logo />
          <nav className="mt-8 flex flex-col gap-1">
            <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Company
            </p>
            {companyNav.map(({ label, to, icon: Icon }) => {
              const active =
                currentPath === to || (to !== "/dashboard" && currentPath.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                  <ChevronRight
                    className={cn("ml-auto size-3.5 opacity-50", active && "opacity-100")}
                  />
                </Link>
              );
            })}
            {isAdmin && (
              <>
                <p className="mb-2 mt-6 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Admin
                </p>
                {adminNav.map(({ label, to, icon: Icon }) => {
                  const active = currentPath === to || currentPath.startsWith(to);
                  return (
                    <Link
                      key={to}
                      to={to}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {label}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>
          <div className="mt-auto border-t border-sidebar-border pt-4">
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar */}
          <header className="no-print sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border/60 bg-background/70 px-4 backdrop-blur md:px-8">
            <button
              className="grid size-9 place-items-center rounded-md lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-sm text-muted-foreground hover:text-foreground lg:hidden"
              >
                <Logo compact />
              </Link>
              {company && (
                <div className="hidden items-center gap-2 md:flex">
                  <span className="text-sm font-medium text-foreground">{company.name}</span>
                  <CompanyPill status={company.status} />
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="size-9 rounded-full p-0">
                  <Avatar className="size-9">
                    <AvatarFallback className="text-xs">
                      {session?.user.email?.[0]?.toUpperCase() ?? "A"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-foreground">{session?.user.email}</p>
                  {isAdmin && <p className="text-xs text-muted-foreground">Platform admin</p>}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                  <Settings className="mr-2 size-4" /> Company profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 size-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
              <aside className="absolute left-0 top-0 flex h-screen w-72 flex-col bg-background p-5">
                <div className="flex items-center justify-between">
                  <Logo />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="grid size-9 place-items-center rounded-md border"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <nav className="mt-8 flex flex-col gap-1">
                  {companyNav.map(({ label, to, icon: Icon }) => (
                    <Link
                      key={to}
                      to={to}
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                    >
                      <Icon className="size-4" /> {label}
                    </Link>
                  ))}
                  {isAdmin &&
                    adminNav.map(({ label, to, icon: Icon }) => (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                      >
                        <Icon className="size-4" /> {label}
                      </Link>
                    ))}
                </nav>
              </aside>
            </div>
          )}

          {/* Content */}
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl">
              {needsOnboarding ? (
                <OnboardingCompanyForm />
              ) : showPending && !isProfileRoute ? (
                <PendingStatusCard status={company.status} note={company.adminNote} />
              ) : (
                <Outlet />
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function CompanyPill({ status }: { status: string }) {
  const style =
    status === "approved"
      ? "bg-genuine/10 text-genuine"
      : status === "pending"
        ? "bg-caution/15 text-caution-foreground"
        : status === "needs_info"
          ? "bg-cyan/10 text-cyan"
          : status === "rejected"
            ? "bg-invalid/10 text-invalid"
            : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
        style,
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function PendingStatusCard({ status, note }: { status: string; note?: string | null }) {
  const Icon = status === "rejected" ? ShieldAlert : status === "needs_info" ? Settings : BarChart3;
  const tone =
    status === "rejected"
      ? "border-invalid/30 bg-invalid/5"
      : status === "needs_info"
        ? "border-cyan/30 bg-cyan/5"
        : "border-caution/30 bg-caution/5";
  const title =
    status === "rejected"
      ? "Registration rejected"
      : status === "needs_info"
        ? "We need more information"
        : "Verification in progress";
  const body =
    status === "rejected"
      ? "Your company registration was not approved. See the note below, or update your details and re-submit."
      : status === "needs_info"
        ? "Please review the admin's note, update your registration documents, and re-submit."
        : "Your business documents are being reviewed by a human on our team. This usually takes 1–2 business days. On approval you will automatically receive 20 free verification codes.";

  return (
    <div className={cn("panel p-8", tone)}>
      <div className="grid size-12 place-items-center rounded-xl bg-card">
        <Icon className="size-6 text-foreground" />
      </div>
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{body}</p>
      {note && (
        <div className="mt-4 rounded-lg border bg-background p-4 text-sm">
          <p className="eyebrow">Note from Asemi</p>
          <p className="mt-1 whitespace-pre-wrap">{note}</p>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/profile">
          <Button>Update company details</Button>
        </Link>
        <Link to="/">
          <Button variant="outline">Back to home</Button>
        </Link>
      </div>
    </div>
  );
}

function OnboardingCompanyForm() {
  const { data: session } = useSession();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(session?.user.email ?? "");
  const [category, setCategory] = useState("Personal care");
  const [countryCode, setCountryCode] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [document, setDocument] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const userId = session!.user.id;
      if (!countryCode) throw new Error("Please select your operating country.");
      let logoUrl: string | null = null;
      let docUrl: string | null = null;

      if (logo) {
        logoUrl = await uploadProductImage(userId, logo);
      }
      if (document) {
        docUrl = await uploadCompanyDoc(userId, document);
      }

      await createCompany(userId, {
        name,
        email,
        phone,
        address,
        category,
        registrationNumber,
        countryCode,
        logoUrl,
        documentUrl: docUrl,
      });
      await queryClient.invalidateQueries({ queryKey: ["my-company", userId] });
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="eyebrow">Step 1 of 2</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
        Register your company
      </h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        A human reviewer will verify your business before you can issue codes. You only need to do
        this once. On approval we credit your account with 20 free verification codes.
      </p>

      <form onSubmit={submit} className="panel mt-6 grid gap-4 p-6 md:p-8">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Company / brand name" required>
            <input
              className="input-like w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>
          <Field label="Business category" required>
            <select
              className="input-like w-full"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              {[
                "Personal care",
                "Oral care",
                "Household",
                "Food & beverage",
                "Pharmaceutical",
                "Cosmetics",
                "Other",
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Operating country" required hint="Sets your pricing region — cannot be changed later">
            <CountrySelectDropdown selectedCode={countryCode} onSelect={setCountryCode} />
          </Field>
          <Field label="CAC / Business registration number" required>
            <input
              className="input-like w-full"
              value={registrationNumber}
              onChange={(e) => setRegistrationNumber(e.target.value)}
              required
            />
          </Field>
          <Field label="Registered address" required>
            <input
              className="input-like w-full"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </Field>
          <Field label="Phone" required>
            <input
              className="input-like w-full"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </Field>
          <Field label="Work email" required>
            <input
              className="input-like w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Brand logo (optional)" hint="Square PNG or JPEG, recommended 512×512">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field
            label="Registration certificate / proof of business"
            required
            hint="Image or PDF — this is for human review only"
          >
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={(e) => setDocument(e.target.files?.[0] ?? null)}
              required
            />
          </Field>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Sign out instead
          </button>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        </div>
      </form>
      <style>{`
        .input-like {
          height: 2.75rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid oklch(0.235 0.04 260 / 0.14);
          background: oklch(0.985 0.005 245 / 0.8);
          padding: 0 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 120ms, box-shadow 120ms;
        }
        .input-like:focus { border-color: oklch(0.63 0.11 220); box-shadow: 0 0 0 3px oklch(0.63 0.11 220 / 0.18); }
        textarea.input-like { height: auto; padding: 0.6rem 0.75rem; }
      `}</style>
    </div>
  );
}

function Field({
  label,
  children,
  required,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-foreground">
        {label} {required && <span className="text-invalid">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}
