import {
  Link,
  Outlet,
  createFileRoute,
  useNavigate,
  useLocation,
  redirect,
} from "@tanstack/react-router";
import { getCachedUserId, getCurrentUserId } from "@/lib/auth";
import {
  LayoutDashboard,
  Package,
  BarChart3,
  UserCircle2,
  Settings,
  LogOut,
  ShieldAlert,
  Menu,
  X,
  Receipt,
  QrCode,
  Gift,
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
  // Fast guard: synchronous check first, only wait briefly when restoring session.
  beforeLoad: async () => {
    const cached = getCachedUserId();
    if (cached) return { userId: cached };
    const userId = await getCurrentUserId();
    if (!userId) throw redirect({ to: "/auth" });
    return { userId };
  },
  pendingComponent: DashboardShellSkeleton,
  component: DashboardShell,
});

function DashboardShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
        <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
        <div className="mt-6 space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-9 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      </aside>
      <div className="flex-1 p-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardShell() {
  const { data: session, isPending: sessionPending } = useSession();
  const {
    data: company,
    isPending: companyPending,
    isError: companyError,
    refetch: refetchCompany,
  } = useMyCompany();
  const { data: isAdmin } = useIsAdmin();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const needsOnboarding =
    !companyPending && !companyError && (!company || company.status === undefined);
  const showPending =
    company &&
    (company.status === "pending" ||
      company.status === "needs_info" ||
      company.status === "rejected");
  const location = useLocation();
  const currentPath = location.pathname;
  const isProfileRoute = currentPath === "/profile" || currentPath.startsWith("/profile");

  const companyNav = [
    { label: "Overview", to: "/dashboard", icon: LayoutDashboard, hint: "Stats & activity" },
    { label: "Products", to: "/products", icon: Package, hint: "Your catalogue" },
    { label: "Batches & Codes", to: "/batches", icon: QrCode, hint: "Generate & export" },
    { label: "Analytics", to: "/analytics", icon: BarChart3, hint: "Scans & flags" },
    { label: "Billing", to: "/billing", icon: Receipt, hint: "Pricing & invoices" },
    { label: "Profile", to: "/profile", icon: UserCircle2, hint: "Company settings" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="flex min-h-screen">
        {/* Sidebar — simple white, blue active state */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
          <div className="px-5 pb-2 pt-5">
            <Logo />
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4">
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              Workspace
            </p>
            <div className="space-y-1">
              {companyNav.map(({ label, to, icon: Icon, hint }) => {
                const active =
                  currentPath === to || (to !== "/dashboard" && currentPath.startsWith(to));
                return (
                  <Link
                    key={to}
                    to={to}
                    preload="intent"
                    title={hint}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-600/25"
                        : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
              <Avatar className="size-8">
                <AvatarFallback className="bg-blue-100 text-xs font-bold text-blue-700">
                  {session?.user.email?.[0]?.toUpperCase() ?? "A"}
                </AvatarFallback>
              </Avatar>
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                {session?.user.email ?? "Loading…"}
              </p>
            </div>
            <button
              onClick={signOut}
              className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Top bar — clean white */}
          <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
            <div className="flex items-center gap-3">
              <button
                className="grid size-9 place-items-center rounded-xl hover:bg-slate-100 lg:hidden"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu className="size-5" />
              </button>
              <span className="lg:hidden">
                <Logo compact />
              </span>
              {company ? (
                <div className="hidden items-center gap-2 md:flex">
                  <span className="max-w-64 truncate text-sm font-semibold text-slate-900">
                    {company.name}
                  </span>
                  <CompanyPill status={company.status} />
                  {Math.max(0, 20 - (company.freeCodesUsed ?? 0)) > 0 && (
                    <span
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200"
                      title="Free registration codes remaining — applied automatically to your next batch"
                    >
                      <Gift className="size-3" />
                      {Math.max(0, 20 - (company.freeCodesUsed ?? 0))}/20 free
                    </span>
                  )}
                </div>
              ) : companyPending || sessionPending ? (
                <div className="hidden h-6 w-40 animate-pulse rounded-full bg-slate-100 md:block" />
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="hidden border-blue-200 text-blue-700 hover:bg-blue-50 sm:inline-flex"
                onClick={() => navigate({ to: "/batches" })}
              >
                <QrCode className="mr-1.5 size-4" /> New batch
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="size-9 rounded-full p-0">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-blue-100 text-xs font-bold text-blue-700">
                        {session?.user.email?.[0]?.toUpperCase() ?? "A"}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 font-sans">
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {session?.user.email}
                    </p>
                    {isAdmin && <p className="text-xs text-slate-500">Platform admin</p>}
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
            </div>
          </header>

          {/* Mobile drawer */}
          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
              <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white p-5 shadow-xl">
                <div className="flex items-center justify-between">
                  <Logo />
                  <button
                    onClick={() => setMobileOpen(false)}
                    className="grid size-9 place-items-center rounded-xl hover:bg-slate-100"
                    aria-label="Close menu"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <nav className="mt-6 flex flex-col gap-1">
                  {companyNav.map(({ label, to, icon: Icon }) => {
                    const active = currentPath === to;
                    return (
                      <Link
                        key={to}
                        to={to}
                        preload="intent"
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                          active
                            ? "bg-blue-600 text-white"
                            : "text-slate-700 hover:bg-blue-50",
                        )}
                      >
                        <Icon className="size-4" /> {label}
                      </Link>
                    );
                  })}
                </nav>
                <button
                  onClick={signOut}
                  className="mt-auto flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100"
                >
                  <LogOut className="size-4" /> Sign out
                </button>
              </aside>
            </div>
          )}

          {/* Content */}
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-6xl">
              {sessionPending || companyPending ? (
                <div className="space-y-4">
                  <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
                  <div className="grid gap-4 md:grid-cols-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
                    ))}
                  </div>
                  <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />
                </div>
              ) : !session ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <p className="font-sans text-lg font-bold">Session expired</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    Please sign in again to continue.
                  </p>
                  <Link to="/auth" className="mt-4 inline-block">
                    <Button className="bg-blue-600 hover:bg-blue-700">Go to sign in</Button>
                  </Link>
                </div>
              ) : companyError ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <p className="font-sans text-lg font-bold">Couldn't load your company</p>
                  <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                    Check your connection and Firestore permissions, then retry.
                  </p>
                  <Button
                    className="mt-4 bg-blue-600 hover:bg-blue-700"
                    onClick={() => refetchCompany()}
                  >
                    Retry
                  </Button>
                </div>
              ) : needsOnboarding ? (
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
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "pending"
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : status === "needs_info"
          ? "bg-cyan-50 text-cyan-700 ring-cyan-200"
          : status === "rejected"
            ? "bg-red-50 text-red-700 ring-red-200"
            : "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset",
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
      ? "border-red-200 bg-red-50/50"
      : status === "needs_info"
        ? "border-cyan-200 bg-cyan-50/50"
        : "border-blue-200 bg-blue-50/50";
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
    <div className={cn("rounded-2xl border bg-white p-8 shadow-sm", tone)}>
      <div className="grid size-12 place-items-center rounded-2xl bg-white shadow-sm">
        <Icon className="size-6 text-blue-600" />
      </div>
      <h1 className="mt-4 font-sans text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500">{body}</p>
      {note && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Note from Asemi
          </p>
          <p className="mt-1 whitespace-pre-wrap">{note}</p>
        </div>
      )}
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/profile">
          <Button className="bg-blue-600 hover:bg-blue-700">Update company details</Button>
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
    <div className="mx-auto max-w-2xl font-sans">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600">
        Step 1 of 2
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Register your company</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-500">
        A human reviewer will verify your business before you can issue codes. You only need to do
        this once. On approval we credit your account with 20 free verification codes.
      </p>

      <form
        onSubmit={submit}
        className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
      >
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
          <Field
            label="Operating country"
            required
            hint="Sets your pricing region — cannot be changed later"
          >
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

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={signOut}
            className="text-sm text-slate-500 hover:text-slate-900"
          >
            Sign out instead
          </button>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="bg-blue-600 hover:bg-blue-700">
              {busy ? "Submitting…" : "Submit for review"}
            </Button>
          </div>
        </div>
      </form>
      <style>{`
        .input-like {
          height: 2.75rem;
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid oklch(0.22 0.035 260 / 0.14);
          background: white;
          padding: 0 0.75rem;
          font-size: 0.875rem;
          font-family: "Inter", sans-serif;
          outline: none;
          transition: border-color 120ms, box-shadow 120ms;
        }
        .input-like:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.15); }
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
    <label className="block space-y-1.5 font-sans">
      <span className="text-sm font-medium text-slate-900">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {children}
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
