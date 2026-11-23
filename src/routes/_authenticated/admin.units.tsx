import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useIsAdmin } from "@/lib/auth";
import { adminSearchUnits, fnSetCodeReview, type AdminUnitRow } from "@/lib/db";
import { PageHeader, EmptyState, StatCard, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Check,
  Download,
  ExternalLink,
  Flag,
  Layers,
  RefreshCw,
  ScanSearch,
  Search,
  ShieldAlert,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/units")({
  head: () => ({ meta: [{ title: "Product units — Asemi Admin" }] }),
  component: AdminUnitsPage,
});

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

function AdminUnitsPage() {
  const isAdmin = useIsAdmin();

  if (isAdmin.isPending) {
    return <div className="h-64 animate-pulse rounded-2xl bg-white shadow-sm" />;
  }
  if (!isAdmin.data) {
    return <NotAuthorizedCard />;
  }

  return <AdminUnitsContent />;
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

function AdminUnitsContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  const units = useQuery({
    queryKey: ["admin-units", debouncedSearch, flaggedOnly],
    staleTime: 20_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: () =>
      adminSearchUnits({
        ...(debouncedSearch ? { queryText: debouncedSearch } : {}),
        flaggedOnly,
        limitN: 150,
      }),
  });

  const rows: AdminUnitRow[] = useMemo(() => units.data ?? [], [units.data]);

  const stats = useMemo(() => {
    const skus = new Set<string>();
    let totalScans = 0;
    let flaggedCount = 0;
    for (const r of rows) {
      if (r.resolvedSku) skus.add(r.resolvedSku.toUpperCase());
      totalScans += r.scanCount || 0;
      if (r.flagged) flaggedCount += 1;
    }
    return {
      total: rows.length,
      uniqueSkus: skus.size,
      totalScans,
      flagged: flaggedCount,
    };
  }, [rows]);

  async function setReviewStatus(codeId: string, status: "reviewed" | "escalated") {
    setBusyId(codeId);
    try {
      await fnSetCodeReview(codeId, status);
      toast.success(status === "reviewed" ? "Marked as reviewed" : "Escalated for further review");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-units"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-flagged-codes"] }),
      ]);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Could not update unit review status");
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    if (!rows.length) return;
    const headers = [
      "Code",
      "SKU",
      "Product",
      "Company",
      "Batch",
      "Lot",
      "Expiry",
      "Scans",
      "Flagged",
      "Status",
      "Last scanned",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.codeString,
          `"${(r.resolvedSku ?? "").replace(/"/g, '""')}"`,
          `"${r.productName.replace(/"/g, '""')}"`,
          `"${r.companyName.replace(/"/g, '""')}"`,
          `"${r.batchNumber.replace(/"/g, '""')}"`,
          `"${(r.lotNumber ?? "").replace(/"/g, '""')}"`,
          r.expiryDate ?? "",
          r.scanCount,
          r.flagged ? "yes" : "no",
          r.reviewStatus,
          r.lastScannedAt ?? "",
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asemi-units-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Product units"
        description="Search serialized product units across all brands by indexed SKU or unit verification code."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap shrink-0"
              onClick={() => units.refetch()}
              disabled={units.isFetching}
            >
              <RefreshCw className={`mr-1.5 size-4 ${units.isFetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="whitespace-nowrap shrink-0"
              onClick={exportCsv}
              disabled={!rows.length}
            >
              <Download className="mr-1.5 size-4" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Matching units"
          value={stats.total.toLocaleString()}
          icon={<ScanSearch className="size-4 text-blue-600" />}
        />
        <StatCard
          label="Unique SKUs"
          value={stats.uniqueSkus.toLocaleString()}
          icon={<Layers className="size-4 text-slate-600" />}
        />
        <StatCard
          label="Total scans"
          value={stats.totalScans.toLocaleString()}
          icon={<TrendingUp className="size-4 text-slate-600" />}
        />
        <StatCard
          label="Flagged units"
          value={stats.flagged.toLocaleString()}
          icon={<Flag className="size-4 text-red-600" />}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div className="relative min-w-[240px] flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search units by SKU (e.g. BRS-0050) or serial code (ASM-…)…"
              className="pl-9 pr-8 font-mono text-xs sm:text-sm"
              aria-label="Search units by SKU or serial code"
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

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={flaggedOnly ? "default" : "outline"}
              onClick={() => setFlaggedOnly((v) => !v)}
              className={`whitespace-nowrap shrink-0 text-xs ${
                flaggedOnly ? "bg-red-600 hover:bg-red-700" : ""
              }`}
            >
              <Flag className="mr-1.5 size-3.5" />
              Flagged only
            </Button>
          </div>
        </div>

        {units.isPending ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : units.isError ? (
          <div className="p-8">
            <EmptyState
              title="Couldn't load product units"
              description={
                units.error instanceof Error
                  ? units.error.message
                  : "Failed to query product units."
              }
              action={
                <Button onClick={() => units.refetch()} className="bg-blue-600 hover:bg-blue-700">
                  Retry
                </Button>
              }
            />
          </div>
        ) : !rows.length ? (
          <div className="p-8">
            <EmptyState
              title={debouncedSearch || flaggedOnly ? "No matching product units" : "No units yet"}
              description={
                debouncedSearch
                  ? `No serialized units matched "${debouncedSearch}". Verify the SKU prefix or full verification code.`
                  : flaggedOnly
                    ? "There are currently no flagged product units."
                    : "Serialized unit codes will appear here once brands mint batches."
              }
              action={
                debouncedSearch || flaggedOnly ? (
                  <div className="flex gap-2">
                    {debouncedSearch && (
                      <Button variant="outline" onClick={() => setSearch("")}>
                        Clear search
                      </Button>
                    )}
                    {flaggedOnly && (
                      <Button variant="outline" onClick={() => setFlaggedOnly(false)}>
                        Show all units
                      </Button>
                    )}
                  </div>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-3">Unit code</TableHead>
                  <TableHead className="px-3">SKU</TableHead>
                  <TableHead className="px-3">Product</TableHead>
                  <TableHead className="px-3">Company</TableHead>
                  <TableHead className="px-3">Batch &amp; provenance</TableHead>
                  <TableHead className="px-3 text-right">Scans</TableHead>
                  <TableHead className="px-3">Status</TableHead>
                  <TableHead className="px-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((u) => {
                  const busy = busyId === u.id;
                  const provParts = [
                    u.lotNumber ? `Lot ${u.lotNumber}` : null,
                    u.expiryDate ? `Exp ${new Date(u.expiryDate).toLocaleDateString()}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  const badgeStatus = u.flagged
                    ? u.reviewStatus === "reviewed"
                      ? "reviewed"
                      : "escalated"
                    : u.reviewStatus === "none"
                      ? "approved"
                      : u.reviewStatus;

                  return (
                    <TableRow key={u.id} className="hover:bg-slate-50/60">
                      <TableCell className="px-3">
                        <p className="font-mono text-xs font-semibold text-slate-900">
                          {u.codeString}
                        </p>
                        {u.flagged && (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-red-600">
                            <Flag className="size-3" /> Flagged
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-3 font-mono text-xs font-medium text-blue-700">
                        {u.resolvedSku || <span className="font-sans text-slate-400">—</span>}
                      </TableCell>
                      <TableCell className="max-w-48 truncate px-3 text-sm text-slate-900">
                        {u.productName}
                      </TableCell>
                      <TableCell className="max-w-44 truncate px-3 text-sm text-slate-600">
                        {u.companyName}
                      </TableCell>
                      <TableCell className="px-3">
                        <p className="font-mono text-xs text-slate-700">{u.batchNumber}</p>
                        {provParts && (
                          <p className="mt-0.5 text-[11px] text-slate-400 tabular-nums">
                            {provParts}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-3 text-right tabular-nums">
                        <p className="text-sm font-medium text-slate-900">
                          {(u.scanCount || 0).toLocaleString()}
                        </p>
                        {u.lastScannedAt && (
                          <p className="text-[10px] text-slate-400">
                            {new Date(u.lastScannedAt).toLocaleDateString()}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="px-3">
                        <StatusBadge status={badgeStatus} />
                      </TableCell>
                      <TableCell className="px-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="h-7 whitespace-nowrap shrink-0 px-2 text-xs"
                          >
                            <Link to="/v/$code" params={{ code: u.codeString }}>
                              <ExternalLink className="mr-1 size-3" /> Verify
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-genuine hover:bg-genuine/10 hover:text-genuine"
                            onClick={() => setReviewStatus(u.id, "reviewed")}
                            disabled={busy || u.reviewStatus === "reviewed"}
                            title="Mark reviewed"
                          >
                            <Check className="size-3.5" />
                            <span className="sr-only">Mark reviewed</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-caution hover:bg-caution/10 hover:text-caution"
                            onClick={() => setReviewStatus(u.id, "escalated")}
                            disabled={busy || u.reviewStatus === "escalated"}
                            title="Escalate"
                          >
                            <ShieldAlert className="size-3.5" />
                            <span className="sr-only">Escalate</span>
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
    </div>
  );
}
