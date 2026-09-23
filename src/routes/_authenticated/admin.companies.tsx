/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useIsAdmin, useSession } from "@/lib/auth";
import {
  adminCompanyOverview,
  fnAdminApproveCompany,
  fnAdminRejectCompany,
  fnAdminRequestInfo,
  type CompanyOverview,
} from "@/lib/db";
import { PageHeader, EmptyState, StatCard, StatusBadge } from "@/components/brand";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ShieldAlert,
  Building2,
  Search,
  Download,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/companies")({
  head: () => ({ meta: [{ title: "Companies — Asemi Admin" }] }),
  component: AdminCompanies,
});

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "needs_info", label: "Needs info" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

function AdminCompanies() {
  const isAdmin = useIsAdmin();

  if (!isAdmin.data) {
    return <NotAuthorizedCard />;
  }

  return <CompaniesContent />;
}

function NotAuthorizedCard() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center p-10 text-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-destructive/10">
            <ShieldAlert className="size-8 text-destructive" />
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold">Not authorized</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is restricted to platform administrators. If you believe you should have
            access, please contact support.
          </p>
          <Button asChild className="mt-6" variant="outline">
            <Link to="/dashboard">
              <Building2 className="mr-2 size-4" /> Back to dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function CompaniesContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    mode: "approve" | "reject" | "request_info" | null;
    company: CompanyOverview | null;
    note: string;
    busy: boolean;
  }>({
    open: false,
    mode: null,
    company: null,
    note: "",
    busy: false,
  });

  const companies = useQuery({
    queryKey: ["admin-company-overview"],
    queryFn: adminCompanyOverview,
    staleTime: 60_000,
  });

  const rows = useMemo(() => {
    const all = companies.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.registrationNumber.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q)
      );
    });
  }, [companies.data, search, statusFilter]);

  const totals = useMemo(() => {
    const all = companies.data ?? [];
    return {
      all: all.length,
      pending: all.filter((c) => c.status === "pending").length,
      needs_info: all.filter((c) => c.status === "needs_info").length,
      approved: all.filter((c) => c.status === "approved").length,
      rejected: all.filter((c) => c.status === "rejected").length,
      totalCodes: all.reduce((s, c) => s + c.codeCount, 0),
      totalProducts: all.reduce((s, c) => s + c.productCount, 0),
    };
  }, [companies.data]);

  async function handleQuickAction(mode: "approve" | "reject", company: CompanyOverview) {
    setDialogState({
      open: true,
      mode,
      company,
      note: mode === "approve" ? "" : `Quick ${mode} from companies table`,
      busy: false,
    });
  }

  async function handleAction() {
    if (!dialogState.company || !dialogState.mode) return;
    setDialogState((s) => ({ ...s, busy: true }));
    try {
      const note = dialogState.note || null;
      if (dialogState.mode === "approve") {
        await fnAdminApproveCompany(dialogState.company.id, note);
      } else if (dialogState.mode === "reject") {
        await fnAdminRejectCompany(dialogState.company.id, note);
      } else {
        await fnAdminRequestInfo(dialogState.company.id, note);
      }
      toast.success(
        dialogState.mode === "approve"
          ? "Company approved"
          : dialogState.mode === "reject"
            ? "Company rejected"
            : "More info requested",
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-company-overview"] });
      setDialogState({ open: false, mode: null, company: null, note: "", busy: false });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setDialogState((s) => ({ ...s, busy: false }));
    }
  }

  function exportCsv() {
    if (!rows.length) return;
    const headers = [
      "Name",
      "Status",
      "Plan",
      "Products",
      "Codes",
      "Registered",
      "Registration",
      "Email",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          `"${r.name.replace(/"/g, '""')}"`,
          r.status,
          "Starter",
          r.productCount,
          r.codeCount,
          r.createdAt,
          r.registrationNumber,
          `"${r.email.replace(/"/g, '""')}"`,
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asemi-companies-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Company directory"
        description="Search, filter, and manage all companies on the platform."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild size="sm">
              <Link to="/admin">
                <ShieldAlert className="mr-2 size-4" /> Approvals queue
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Companies"
          value={totals.all.toLocaleString()}
          icon={<Building2 className="size-4" />}
        />
        <StatCard label="Pending" value={totals.pending.toLocaleString()} />
        <StatCard label="Approved" value={totals.approved.toLocaleString()} />
        <StatCard label="Products" value={totals.totalProducts.toLocaleString()} />
        <StatCard label="Codes issued" value={totals.totalCodes.toLocaleString()} />
      </div>

      <div className="panel">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, or registration number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
            <Download className="mr-2 size-4" /> CSV
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-b p-3">
          {STATUS_FILTERS.map(({ key, label }) => {
            const count =
              key === "all" ? totals.all : ((totals as Record<string, number>)[key] ?? 0);
            const active = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {label}
                <span
                  className={cn(
                    "tabular-nums rounded-full px-1.5 py-0.5 text-[10px]",
                    active ? "bg-primary-foreground/20" : "bg-muted",
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No companies match"
            description={
              search || statusFilter !== "all"
                ? "Try adjusting your search or clearing the status filter."
                : "No companies registered yet."
            }
            action={
              search || statusFilter !== "all" ? (
                <div className="flex gap-2">
                  {search && (
                    <Button variant="outline" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  )}
                  {statusFilter !== "all" && (
                    <Button variant="outline" onClick={() => setStatusFilter("all")}>
                      Clear filter
                    </Button>
                  )}
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[30px] p-3" />
                  <TableHead className="px-3">Company</TableHead>
                  <TableHead className="px-3">Status</TableHead>
                  <TableHead className="px-3">Plan</TableHead>
                  <TableHead className="px-3 text-right">Products</TableHead>
                  <TableHead className="px-3 text-right">Codes</TableHead>
                  <TableHead className="px-3">Registered</TableHead>
                  <TableHead className="px-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const expanded = expandedId === c.id;
                  return (
                    <>
                      <TableRow
                        key={c.id}
                        className={cn("group cursor-pointer", expanded && "bg-accent/30")}
                        onClick={() => setExpandedId(expanded ? null : c.id)}
                      >
                        <TableCell className="w-[30px] p-3 text-muted-foreground">
                          {expanded ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </TableCell>
                        <TableCell className="px-3">
                          <div>
                            <p className="text-sm font-medium leading-tight">{c.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{c.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-3">
                          <StatusBadge status={c.status} />
                        </TableCell>
                        <TableCell className="px-3">
                          <span className="text-sm capitalize">Starter</span>
                        </TableCell>
                        <TableCell className="px-3 text-right tabular-nums">
                          {c.productCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-3 text-right tabular-nums">
                          {c.codeCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="px-3 text-xs text-muted-foreground">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="px-3 text-right">
                          <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
                            {(c.status === "pending" || c.status === "needs_info") && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-genuine hover:bg-genuine/10 hover:text-genuine"
                                  onClick={() => handleQuickAction("approve", c)}
                                >
                                  <Check className="size-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-invalid hover:bg-invalid/10 hover:text-invalid"
                                  onClick={() => handleQuickAction("reject", c)}
                                >
                                  <X className="size-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow
                          key={`${c.id}-details`}
                          className="bg-accent/20 hover:bg-accent/20"
                        >
                          <TableCell colSpan={8} className="p-5">
                            <div className="grid gap-5 md:grid-cols-3">
                              <div className="space-y-2 text-sm">
                                <p className="eyebrow">Registration details</p>
                                <p>
                                  <span className="text-muted-foreground">Name:</span> {c.name}
                                </p>
                                <p>
                                  <span className="text-muted-foreground">CAC / Reg no:</span>{" "}
                                  <span className="font-mono">{c.registrationNumber}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Email:</span> {c.email}
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Signed up:</span>{" "}
                                  {new Date(c.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <div className="space-y-2 text-sm">
                                <p className="eyebrow">Usage</p>
                                <p>
                                  <span className="text-muted-foreground">Products:</span>{" "}
                                  {c.productCount}
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Codes issued:</span>{" "}
                                  {c.codeCount.toLocaleString()}
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Subscription:</span>{" "}
                                  Starter
                                </p>
                              </div>
                              <div className="space-y-2">
                                <p className="eyebrow">Quick actions</p>
                                <div className="flex flex-wrap gap-2">
                                  {(c.status === "pending" ||
                                    c.status === "needs_info" ||
                                    c.status === "rejected") && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        setDialogState({
                                          open: true,
                                          mode: "approve",
                                          company: c,
                                          note: "",
                                          busy: false,
                                        })
                                      }
                                    >
                                      <Check className="size-4" /> Approve
                                    </Button>
                                  )}
                                  {(c.status === "pending" ||
                                    c.status === "needs_info" ||
                                    c.status === "approved") && (
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() =>
                                        setDialogState({
                                          open: true,
                                          mode: "reject",
                                          company: c,
                                          note: "",
                                          busy: false,
                                        })
                                      }
                                    >
                                      <X className="size-4" /> Reject
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                      setDialogState({
                                        open: true,
                                        mode: "request_info",
                                        company: c,
                                        note: "",
                                        busy: false,
                                      })
                                    }
                                  >
                                    <MessageSquare className="size-4" /> Request info
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog
        open={dialogState.open}
        onOpenChange={(open) =>
          !dialogState.busy &&
          setDialogState((s) => ({ ...s, open, company: open ? s.company : null }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialogState.mode === "approve" && "Approve company registration"}
              {dialogState.mode === "reject" && "Reject company registration"}
              {dialogState.mode === "request_info" && "Request more information"}
            </DialogTitle>
            {dialogState.company && (
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{dialogState.company.name}</span> ·{" "}
                {dialogState.company.registrationNumber}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="companies-action-note">
              {dialogState.mode === "approve"
                ? "Admin note (optional)"
                : dialogState.mode === "reject"
                  ? "Reason for rejection (required)"
                  : "What information do you need? (required)"}
            </Label>
            <Textarea
              id="companies-action-note"
              placeholder={
                dialogState.mode === "approve"
                  ? "Leave a note for the audit log…"
                  : dialogState.mode === "reject"
                    ? "Please explain why this registration was rejected…"
                    : "e.g. Please upload a clearer scan of your CAC certificate…"
              }
              value={dialogState.note}
              onChange={(e) => setDialogState((s) => ({ ...s, note: e.target.value }))}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setDialogState({
                  open: false,
                  mode: null,
                  company: null,
                  note: "",
                  busy: false,
                })
              }
              disabled={dialogState.busy}
            >
              Cancel
            </Button>
            <Button
              variant={dialogState.mode === "reject" ? "destructive" : "default"}
              onClick={handleAction}
              disabled={
                dialogState.busy || (dialogState.mode !== "approve" && !dialogState.note.trim())
              }
            >
              {dialogState.busy
                ? "Processing…"
                : dialogState.mode === "approve"
                  ? "Approve"
                  : dialogState.mode === "reject"
                    ? "Reject"
                    : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
