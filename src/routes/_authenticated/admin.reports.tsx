import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { fb as supabase } from "@/integrations/firebase/client";
import { useIsAdmin, useSession } from "@/lib/auth";
import { PageHeader, EmptyState, StatCard, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatNaira } from "@/lib/pricing";
import {
  ShieldAlert,
  Building2,
  Inbox,
  Search,
  Download,
  Check,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({ meta: [{ title: "Reports inbox — Asemi Admin" }] }),
  component: AdminReports,
});

type ReportRow = {
  id: string;
  code_id: string | null;
  code_string: string;
  company_id: string | null;
  contact: string | null;
  created_at: string;
  message: string;
  reviewed: boolean;
  companies: { name: string } | null;
  codes: { id: string; code_string: string } | null;
};

type ReviewedFilter = "all" | "unreviewed" | "reviewed";

const REVIEWED_FILTERS: Array<{ key: ReviewedFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "unreviewed", label: "New / unreviewed" },
  { key: "reviewed", label: "Reviewed" },
];

function AdminReports() {
  const isAdmin = useIsAdmin();

  if (!isAdmin.data) {
    return <NotAuthorizedCard />;
  }

  return <ReportsContent />;
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

function ReportsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [reviewedFilter, setReviewedFilter] = useState<ReviewedFilter>("unreviewed");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reports = useQuery({
    queryKey: ["admin-reports-inbox"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(
          `*,
           companies:companies(name),
           codes:codes(id, code_string)`,
        )
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as ReportRow[];
    },
  });

  const rows = useMemo(() => {
    const all = reports.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((r) => {
      if (reviewedFilter === "unreviewed" && r.reviewed) return false;
      if (reviewedFilter === "reviewed" && !r.reviewed) return false;
      if (!q) return true;
      return (
        r.code_string.toLowerCase().includes(q) ||
        r.companies?.name.toLowerCase().includes(q) ||
        r.message.toLowerCase().includes(q) ||
        (r.contact ?? "").toLowerCase().includes(q)
      );
    });
  }, [reports.data, search, reviewedFilter]);

  const stats = useMemo(() => {
    const all = reports.data ?? [];
    return {
      total: all.length,
      unreviewed: all.filter((r) => !r.reviewed).length,
      reviewed: all.filter((r) => r.reviewed).length,
    };
  }, [reports.data]);

  async function toggleReviewed(report: ReportRow) {
    setBusyId(report.id);
    try {
      const nextReviewed = !report.reviewed;
      const { error } = await supabase.rpc("admin_review_report", {
        _report_id: report.id,
        _reviewed: nextReviewed,
      });
      if (error) throw error;
      toast.success(nextReviewed ? "Marked as reviewed" : "Reopened report");
      await queryClient.invalidateQueries({ queryKey: ["admin-reports-inbox"] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    if (!rows.length) return;
    const headers = ["Submitted", "Code", "Company", "Contact", "Message", "Reviewed"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.created_at,
          r.code_string,
          `"${(r.companies?.name ?? "").replace(/"/g, '""')}"`,
          `"${(r.contact ?? "").replace(/"/g, '""')}"`,
          `"${r.message.replace(/"/g, '""').replace(/\n/g, " ")}"`,
          r.reviewed ? "yes" : "no",
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asemi-reports-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function excerpt(text: string, max: number = 120) {
    if (text.length <= max) return text;
    return text.slice(0, max) + "…";
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consumer reports inbox"
        description="Messages and counterfeit reports submitted by consumers from the public verify page."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="mr-2 size-4" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total reports"
          value={stats.total.toLocaleString()}
          icon={<Inbox className="size-4" />}
        />
        <StatCard
          label="Needs review"
          value={stats.unreviewed.toLocaleString()}
          icon={<MessageSquare className="size-4 text-caution" />}
        />
        <StatCard
          label="Reviewed"
          value={stats.reviewed.toLocaleString()}
          icon={<Check className="size-4 text-genuine" />}
        />
      </div>

      <div className="panel">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search code, company, contact, or message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b p-3">
          {REVIEWED_FILTERS.map(({ key, label }) => {
            const count =
              key === "all"
                ? stats.total
                : key === "unreviewed"
                  ? stats.unreviewed
                  : stats.reviewed;
            const active = reviewedFilter === key;
            return (
              <button
                key={key}
                onClick={() => setReviewedFilter(key)}
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
            title={reviewedFilter === "unreviewed" ? "No new reports" : "No reports in inbox"}
            description={
              search
                ? "Try adjusting your search or filter."
                : reviewedFilter === "unreviewed"
                  ? "All caught up — every consumer report has been reviewed. Nice work!"
                  : "No consumer reports submitted yet."
            }
            action={
              search || reviewedFilter !== "unreviewed" ? (
                <div className="flex gap-2">
                  {search && (
                    <Button variant="outline" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  )}
                  {reviewedFilter !== "unreviewed" && (
                    <Button variant="outline" onClick={() => setReviewedFilter("unreviewed")}>
                      Show unreviewed
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
                  <TableHead className="px-3 w-28 whitespace-nowrap">Submitted</TableHead>
                  <TableHead className="px-3">Code</TableHead>
                  <TableHead className="px-3">Company</TableHead>
                  <TableHead className="px-3">Contact</TableHead>
                  <TableHead className="px-3">Message</TableHead>
                  <TableHead className="px-3">Status</TableHead>
                  <TableHead className="px-3 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const expanded = expandedId === r.id;
                  const busy = busyId === r.id;
                  return (
                    <>
                      <TableRow
                        key={r.id}
                        className={cn("group cursor-pointer", expanded && "bg-accent/30")}
                        onClick={() => setExpandedId(expanded ? null : r.id)}
                      >
                        <TableCell className="w-[30px] p-3 text-muted-foreground">
                          <MessageSquare className={cn("size-4", !r.reviewed && "text-caution")} />
                        </TableCell>
                        <TableCell className="px-3 w-28 whitespace-nowrap">
                          <div className="text-xs">
                            <p>{new Date(r.created_at).toLocaleDateString()}</p>
                            <p className="text-muted-foreground">
                              {new Date(r.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="px-3">
                          <span className="font-mono text-sm">{r.code_string}</span>
                        </TableCell>
                        <TableCell className="px-3 text-sm">
                          {r.companies?.name ?? (
                            <span className="text-muted-foreground">Unknown</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 text-sm">
                          {r.contact ? (
                            <p className="truncate max-w-[180px]" title={r.contact}>
                              {r.contact}
                            </p>
                          ) : (
                            <span className="text-muted-foreground">Anonymous</span>
                          )}
                        </TableCell>
                        <TableCell className="px-3 max-w-[420px]">
                          <p className="text-sm line-clamp-2 text-muted-foreground">
                            {excerpt(r.message)}
                          </p>
                        </TableCell>
                        <TableCell className="px-3">
                          <StatusBadge status={r.reviewed ? "reviewed" : "open"} />
                        </TableCell>
                        <TableCell className="px-3 text-right">
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant={r.reviewed ? "outline" : "default"}
                              className="h-7 px-2"
                              onClick={() => toggleReviewed(r)}
                              disabled={busy}
                            >
                              <Check className={cn("size-3.5", r.reviewed && "opacity-50")} />
                              <span className="ml-1">{r.reviewed ? "Reopen" : "Review"}</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow
                          key={`${r.id}-details`}
                          className="bg-accent/20 hover:bg-accent/20"
                        >
                          <TableCell colSpan={8} className="p-5">
                            <div className="grid gap-5 md:grid-cols-3">
                              <div className="space-y-2 text-sm md:col-span-1">
                                <p className="eyebrow">Report details</p>
                                <p>
                                  <span className="text-muted-foreground">Submitted:</span>{" "}
                                  {new Date(r.created_at).toLocaleString()}
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Code:</span>{" "}
                                  <span className="font-mono">{r.code_string}</span>
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Company:</span>{" "}
                                  {r.companies?.name ?? "Unknown"}
                                </p>
                                <p>
                                  <span className="text-muted-foreground">Contact:</span>{" "}
                                  {r.contact ?? "Anonymous"}
                                </p>
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <p className="eyebrow">Full message</p>
                                <div className="rounded-lg border bg-background p-4">
                                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {r.message}
                                  </p>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => (window.location.href = `/v/${r.code_string}`)}
                                  >
                                    View code page
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={r.reviewed ? "outline" : "default"}
                                    onClick={() => toggleReviewed(r)}
                                    disabled={busy}
                                  >
                                    <Check className="size-4" />
                                    {r.reviewed ? "Mark as unreviewed" : "Mark as reviewed"}
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
    </div>
  );
}
