/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fb as supabase } from "@/integrations/firebase/client";
import { useIsAdmin, useSession } from "@/lib/auth";
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
import { formatNaira } from "@/lib/pricing";
import { ShieldAlert, Search, Download, Check, X, MessageSquare, Building2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Approvals — Asemi Admin" }] }),
  component: AdminApprovals,
});

type CompanyRow = {
  id: string;
  name: string;
  category: string;
  registration_number: string;
  status: string;
  ai_confidence: number | null;
  ai_flags: unknown;
  document_url: string | null;
  created_at: string;
  email: string;
  address: string;
  phone: string;
  owner_id: string;
};

type PlatformMetrics = {
  pending_companies: number;
  needs_info_companies: number;
  approved_companies: number;
  rejected_companies: number;
  total_codes: number;
  total_companies: number;
  total_scans_30d: number;
  total_revenue: number;
};

function AdminApprovals() {
  const isAdmin = useIsAdmin();

  if (!isAdmin.data) {
    return <NotAuthorizedCard />;
  }

  return <ApprovalsContent />;
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

function ApprovalsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    mode: "approve" | "reject" | "request_info" | null;
    company: CompanyRow | null;
    note: string;
    busy: boolean;
  }>({
    open: false,
    mode: null,
    company: null,
    note: "",
    busy: false,
  });

  const metrics = useQuery({
    queryKey: ["platform-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("platform_metrics");
      if (error) throw error;
      return data as unknown as PlatformMetrics;
    },
  });

  const companies = useQuery({
    queryKey: ["admin-approvals-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .in("status", ["pending", "needs_info"])
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as CompanyRow[];
    },
  });

  const m = metrics.data;
  const rows = (companies.data ?? []).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.registration_number.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  });

  async function handleAction() {
    if (!dialogState.company || !dialogState.mode) return;
    setDialogState((s) => ({ ...s, busy: true }));
    try {
      const rpc =
        dialogState.mode === "approve"
          ? "admin_approve_company"
          : dialogState.mode === "reject"
            ? "admin_reject_company"
            : "admin_request_info";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const args: any = { _company_id: dialogState.company.id };
      if (dialogState.note) args._note = dialogState.note;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.rpc as any)(rpc, args);
      if (error) throw error;
      toast.success(
        dialogState.mode === "approve"
          ? "Company approved"
          : dialogState.mode === "reject"
            ? "Company rejected"
            : "More info requested",
      );
      await queryClient.invalidateQueries({ queryKey: ["admin-approvals-queue"] });
      await queryClient.invalidateQueries({ queryKey: ["platform-metrics"] });
      setDialogState({ open: false, mode: null, company: null, note: "", busy: false });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setDialogState((s) => ({ ...s, busy: false }));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals queue"
        description="Review and process company registration requests."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/companies">
                <Building2 className="mr-2 size-4" /> All companies
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Pending review"
          value={(m?.pending_companies ?? 0).toLocaleString()}
          icon={<ShieldAlert className="size-4 text-caution" />}
        />
        <StatCard
          label="Needs info"
          value={(m?.needs_info_companies ?? 0).toLocaleString()}
          icon={<MessageSquare className="size-4 text-cyan" />}
        />
        <StatCard
          label="Approved"
          value={(m?.approved_companies ?? 0).toLocaleString()}
          icon={<Check className="size-4 text-genuine" />}
        />
        <StatCard
          label="Total companies"
          value={(m?.total_companies ?? 0).toLocaleString()}
          icon={<Building2 className="size-4" />}
        />
        <StatCard
          label="Platform codes"
          value={(m?.total_codes ?? 0).toLocaleString()}
          hint={`Revenue: ${formatNaira(m?.total_revenue ?? 0)}`}
        />
      </div>

      <div className="panel">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search company name, email, or registration number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" disabled={!rows.length}>
            <Download className="mr-2 size-4" /> Export CSV
          </Button>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Nothing in the queue"
            description={
              search
                ? "No companies match your search. Try a different query."
                : "All caught up — no pending or needs-info registrations."
            }
            action={
              search ? (
                <Button variant="outline" onClick={() => setSearch("")}>
                  Clear search
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="divide-y">
            {rows.map((c) => (
              <ApprovalRow
                key={c.id}
                company={c}
                onApprove={() =>
                  setDialogState({
                    open: true,
                    mode: "approve",
                    company: c,
                    note: "",
                    busy: false,
                  })
                }
                onReject={() =>
                  setDialogState({
                    open: true,
                    mode: "reject",
                    company: c,
                    note: "",
                    busy: false,
                  })
                }
                onRequestInfo={() =>
                  setDialogState({
                    open: true,
                    mode: "request_info",
                    company: c,
                    note: "",
                    busy: false,
                  })
                }
              />
            ))}
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
                {dialogState.company.registration_number}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="action-note">
              {dialogState.mode === "approve"
                ? "Admin note (optional)"
                : dialogState.mode === "reject"
                  ? "Reason for rejection (required)"
                  : "What information do you need? (required)"}
            </Label>
            <Textarea
              id="action-note"
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

function ApprovalRow({
  company,
  onApprove,
  onReject,
  onRequestInfo,
}: {
  company: CompanyRow;
  onApprove: () => void;
  onReject: () => void;
  onRequestInfo: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const aiFlags = company.ai_flags;
  const flags: string[] = Array.isArray(aiFlags)
    ? (aiFlags as unknown[]).map((f) => String(f))
    : typeof aiFlags === "object" && aiFlags !== null
      ? Object.entries(aiFlags as Record<string, unknown>)
          .map(([k, v]) => (v === true || v ? k : null))
          .filter((v): v is string => v !== null)
      : [];

  return (
    <div className="p-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex-1 min-w-[280px]">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-semibold">{company.name}</h3>
            <StatusBadge status={company.status} />
            {company.ai_confidence !== null && company.ai_confidence !== undefined && (
              <span
                className={cn(
                  "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums",
                  company.ai_confidence >= 0.85
                    ? "bg-genuine/10 text-genuine"
                    : company.ai_confidence >= 0.6
                      ? "bg-caution/15 text-caution-foreground"
                      : "bg-invalid/10 text-invalid",
                )}
              >
                AI: {Math.round(company.ai_confidence * 100)}%
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>{company.category}</span>
            <span className="font-mono">{company.registration_number}</span>
            <span>{company.email}</span>
            <span>{new Date(company.created_at).toLocaleDateString()}</span>
          </div>
          {flags.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {flags.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md bg-invalid/10 px-2 py-0.5 text-[11px] font-medium text-invalid"
                >
                  <Flag className="size-3" /> {String(f)}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setExpanded((e) => !e)}>
            {expanded ? "Hide document" : "View document"}
          </Button>
          <Button size="sm" variant="default" onClick={onApprove}>
            <Check className="size-4" /> Approve
          </Button>
          <Button size="sm" variant="secondary" onClick={onRequestInfo}>
            <MessageSquare className="size-4" /> Need info
          </Button>
          <Button size="sm" variant="destructive" onClick={onReject}>
            <X className="size-4" /> Reject
          </Button>
        </div>
      </div>

      {expanded && company.document_url && (
        <div className="mt-4">
          <div className="overflow-hidden rounded-xl border">
            <iframe
              src={company.document_url}
              title={`${company.name} registration document`}
              className="h-[520px] w-full bg-muted/30"
              sandbox="allow-same-origin allow-scripts"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function Flag({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" x2="4" y1="22" y2="15" />
    </svg>
  );
}
