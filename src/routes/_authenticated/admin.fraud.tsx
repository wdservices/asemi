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
import { ShieldAlert, Building2, Flag, Search, Download, Check, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/fraud")({
  head: () => ({ meta: [{ title: "Fraud review — Asemi Admin" }] }),
  component: AdminFraud,
});

type FlaggedCode = {
  id: string;
  code_string: string;
  scan_count: number;
  flagged: boolean;
  review_status: string;
  created_at: string;
  last_scanned_at: string | null;
  companies: { name: string } | null;
  products: { name: string } | null;
  batches: { batch_number: string } | null;
  scans: Array<{ city: string | null; country: string | null }>;
};

const REVIEW_FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "reviewed", label: "Reviewed" },
  { key: "escalated", label: "Escalated" },
  { key: "flagged", label: "Flagged only" },
];

function AdminFraud() {
  const isAdmin = useIsAdmin();

  if (!isAdmin.data) {
    return <NotAuthorizedCard />;
  }

  return <FraudContent />;
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

function FraudContent() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState<string>("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const flaggedCodes = useQuery({
    queryKey: ["admin-flagged-codes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("codes")
        .select(
          `id, code_string, scan_count, flagged, review_status, created_at, last_scanned_at,
         companies:companies!inner(name),
         products:products!inner(name),
         batches:batches!inner(batch_number),
         scans!left(city, country)`,
        )
        .or("flagged.eq.true,review_status.neq.none")
        .order("last_scanned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as unknown as FlaggedCode[];
    },
  });

  const trend30d = useQuery({
    queryKey: ["admin-flagged-trend"],
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data, error } = await supabase
        .from("scans")
        .select("scanned_at, flagged")
        .gte("scanned_at", since)
        .order("scanned_at", { ascending: true });
      if (error) throw error;
      const byDay = new Map<string, { day: string; flagged: number; genuine: number }>();
      for (const s of data ?? []) {
        const d = new Date(s.scanned_at).toISOString().slice(0, 10);
        if (!byDay.has(d)) byDay.set(d, { day: d.slice(5), flagged: 0, genuine: 0 });
        const row = byDay.get(d)!;
        if (s.flagged) row.flagged += 1;
        else row.genuine += 1;
      }
      return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
    },
  });

  const rows = useMemo(() => {
    const all = flaggedCodes.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      if (reviewFilter === "flagged" && !c.flagged) return false;
      if (reviewFilter !== "all" && reviewFilter !== "flagged" && c.review_status !== reviewFilter)
        return false;
      if (!q) return true;
      return (
        c.code_string.toLowerCase().includes(q) ||
        c.companies?.name.toLowerCase().includes(q) ||
        c.products?.name.toLowerCase().includes(q) ||
        c.batches?.batch_number.toLowerCase().includes(q)
      );
    });
  }, [flaggedCodes.data, search, reviewFilter]);

  const stats = useMemo(() => {
    const all = flaggedCodes.data ?? [];
    return {
      total: all.length,
      open: all.filter((c) => c.review_status === "open" || c.flagged).length,
      reviewed: all.filter((c) => c.review_status === "reviewed").length,
      escalated: all.filter((c) => c.review_status === "escalated").length,
      totalScans: all.reduce((s, c) => s + (c.scan_count || 0), 0),
    };
  }, [flaggedCodes.data]);

  async function setReviewStatus(codeId: string, status: "reviewed" | "escalated") {
    setBusyId(codeId);
    try {
      const { error } = await supabase.rpc("set_code_review", {
        _code_id: codeId,
        _status: status,
      });
      if (error) throw error;
      toast.success(status === "reviewed" ? "Marked as reviewed" : "Escalated for further review");
      await queryClient.invalidateQueries({ queryKey: ["admin-flagged-codes"] });
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusyId(null);
    }
  }

  function distinctLocations(scans: FlaggedCode["scans"]) {
    const cities = new Set<string>();
    const countries = new Set<string>();
    for (const s of scans ?? []) {
      if (s.city) cities.add(s.city);
      if (s.country) countries.add(s.country);
    }
    return { cities: cities.size, countries: countries.size };
  }

  function exportCsv() {
    if (!rows.length) return;
    const headers = [
      "Code",
      "Company",
      "Product",
      "Batch",
      "Scans",
      "Cities",
      "Countries",
      "Flagged",
      "Status",
      "Last scanned",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      const locs = distinctLocations(r.scans);
      lines.push(
        [
          r.code_string,
          `"${(r.companies?.name ?? "").replace(/"/g, '""')}"`,
          `"${(r.products?.name ?? "").replace(/"/g, '""')}"`,
          r.batches?.batch_number ?? "",
          r.scan_count,
          locs.cities,
          locs.countries,
          r.flagged ? "yes" : "no",
          r.review_status,
          r.last_scanned_at ?? "",
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asemi-fraud-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const chartConfig = {
    flagged: {
      label: "Flagged",
      color: "hsl(var(--chart-5))",
    },
    genuine: {
      label: "Genuine",
      color: "hsl(var(--chart-2))",
    },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fraud review"
        description="Review flagged codes, suspicious scan patterns, and escalate cases."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!rows.length}>
              <Download className="mr-2 size-4" /> Export CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Flagged codes"
          value={stats.total.toLocaleString()}
          icon={<Flag className="size-4 text-invalid" />}
        />
        <StatCard
          label="Open review"
          value={stats.open.toLocaleString()}
          icon={<ShieldAlert className="size-4 text-caution" />}
        />
        <StatCard
          label="Reviewed"
          value={stats.reviewed.toLocaleString()}
          icon={<Check className="size-4 text-genuine" />}
        />
        <StatCard label="Escalated" value={stats.escalated.toLocaleString()} />
        <StatCard
          label="Total scans"
          value={stats.totalScans.toLocaleString()}
          icon={<TrendingUp className="size-4" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Flagged scans trend (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56 w-full">
            <ChartContainer config={chartConfig}>
              <LineChart
                data={trend30d.data ?? []}
                margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.235 0.04 260 / 0.08)" />
                <XAxis
                  dataKey="day"
                  stroke="oklch(0.53 0.04 255)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="oklch(0.53 0.04 255)"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="genuine"
                  name="Genuine"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="flagged"
                  name="Flagged"
                  stroke="var(--color-chart-5)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </div>
        </CardContent>
      </Card>

      <div className="panel">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search code, company, product, or batch…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b p-3">
          {REVIEW_FILTERS.map(({ key, label }) => {
            const active = reviewFilter === key;
            return (
              <button
                key={key}
                onClick={() => setReviewFilter(key)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="No flagged codes"
            description={
              search || reviewFilter !== "all"
                ? "Try adjusting your search or filter."
                : "No codes flagged for review in the last period."
            }
            action={
              search || reviewFilter !== "all" ? (
                <div className="flex gap-2">
                  {search && (
                    <Button variant="outline" onClick={() => setSearch("")}>
                      Clear search
                    </Button>
                  )}
                  {reviewFilter !== "all" && (
                    <Button variant="outline" onClick={() => setReviewFilter("all")}>
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
                  <TableHead className="px-3">Code</TableHead>
                  <TableHead className="px-3">Company</TableHead>
                  <TableHead className="px-3">Product</TableHead>
                  <TableHead className="px-3">Batch</TableHead>
                  <TableHead className="px-3 text-right">Scans</TableHead>
                  <TableHead className="px-3 text-right">Locations</TableHead>
                  <TableHead className="px-3">Status</TableHead>
                  <TableHead className="px-3 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((c) => {
                  const locs = distinctLocations(c.scans);
                  const busy = busyId === c.id;
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="px-3">
                        <div>
                          <p className="font-mono text-sm font-medium">{c.code_string}</p>
                          {c.flagged && (
                            <span className="mt-0.5 inline-flex items-center gap-1 rounded-md bg-invalid/10 px-1.5 py-0.5 text-[10px] font-medium text-invalid">
                              <Flag className="size-3" /> Flagged
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 text-sm">{c.companies?.name ?? "—"}</TableCell>
                      <TableCell className="px-3 text-sm">{c.products?.name ?? "—"}</TableCell>
                      <TableCell className="px-3 font-mono text-xs">
                        {c.batches?.batch_number ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 text-right tabular-nums">
                        <div>
                          <p className="text-sm font-medium tabular-nums">
                            {c.scan_count.toLocaleString()}
                          </p>
                          {c.last_scanned_at && (
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(c.last_scanned_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-3 text-right">
                        <div className="text-xs">
                          <p className="tabular-nums">
                            {locs.cities} {locs.cities === 1 ? "city" : "cities"}
                          </p>
                          <p className="text-muted-foreground tabular-nums">
                            {locs.countries} {locs.countries === 1 ? "country" : "countries"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="px-3">
                        <StatusBadge
                          status={c.review_status === "none" ? "open" : c.review_status}
                        />
                      </TableCell>
                      <TableCell className="px-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-genuine hover:bg-genuine/10 hover:text-genuine"
                            onClick={() => setReviewStatus(c.id, "reviewed")}
                            disabled={busy || c.review_status === "reviewed"}
                          >
                            <Check className="size-3.5" />
                            <span className="sr-only">Mark reviewed</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-caution hover:bg-caution/10 hover:text-caution"
                            onClick={() => setReviewStatus(c.id, "escalated")}
                            disabled={busy || c.review_status === "escalated"}
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
