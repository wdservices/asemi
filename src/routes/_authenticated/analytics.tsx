/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMyCompany, type Company } from "@/lib/auth";
import { listCodes, listCompanyScans, listProducts } from "@/lib/db";
import { PageHeader, EmptyState, StatCard, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3,
  ScanEye,
  Flag,
  QrCode,
  MapPin,
  CalendarDays,
  ChevronRight,
  ArrowRight,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Asemi" }] }),
  component: AnalyticsPage,
});

type ScanPoint = { day: string; genuine: number; flagged: number };
type CityPoint = { city: string; scans: number; unique: number };
type FlaggedRow = {
  id: string;
  code_string: string;
  product_id: string;
  product_name: string;
  scan_count: number;
  cities_count: number;
  review_status: any;
};

const PRESETS: { key: "7d" | "30d" | "90d"; label: string; days: number }[] = [
  { key: "7d", label: "Last 7 days", days: 7 },
  { key: "30d", label: "Last 30 days", days: 30 },
  { key: "90d", label: "Last 90 days", days: 90 },
];

function AnalyticsPage() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;
  const navigate = useNavigate();

  const [preset, setPreset] = useState<"7d" | "30d" | "90d">("30d");
  const [productId, setProductId] = useState("all");

  const days = PRESETS.find((p) => p.key === preset)!.days;
  const since = useMemo(() => new Date(Date.now() - days * 864e5).toISOString(), [days]);

  const products = useQuery({
    queryKey: ["products", companyId],
    enabled: !!companyId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: () => listProducts(companyId!),
  });

  const scans = useQuery({
    queryKey: ["analytics-scans", companyId, since, productId],
    enabled: !!companyId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const all = await listCompanyScans(companyId!, since);
      return productId === "all" ? all : all.filter((s) => s.productId === productId);
    },
  });

  const flaggedCodes = useQuery({
    queryKey: ["analytics-flagged", companyId, since, productId],
    enabled: !!companyId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<FlaggedRow[]> => {
      const codes = await listCodes(companyId!, {
        productId: productId === "all" ? undefined : productId,
        flaggedOnly: true,
        limitN: 50,
      });
      const productNames = new Map((products.data ?? []).map((p) => [p.id, p.name]));
      const citiesPerCode: Record<string, Set<string>> = {};
      for (const s of scans.data ?? []) {
        if (!s.city) continue;
        (citiesPerCode[s.codeId] ??= new Set()).add(s.city);
      }
      return codes
        .map(
          (c) =>
            ({
              id: c.id,
              code_string: c.codeString,
              product_id: c.productId,
              product_name: productNames.get(c.productId) ?? "—",
              scan_count: c.scanCount,
              cities_count: citiesPerCode[c.id]?.size ?? 0,
              review_status: c.reviewStatus,
            }) satisfies FlaggedRow,
        )
        .sort((a, b) => b.scan_count - a.scan_count);
    },
  });

  const { scanSeries, citySeries, totalScans, flaggedCount, uniqueCodes, distinctCities } =
    useMemo(() => {
      const raw = scans.data ?? [];
      const byDay = new Map<string, ScanPoint>();
      const byCity = new Map<string, { scans: number; codes: Set<string> }>();
      const codes = new Set<string>();
      let flagged = 0;

      for (const s of raw) {
        const d = new Date(s.scannedAt).toISOString().slice(5, 10);
        if (!byDay.has(d)) byDay.set(d, { day: d, genuine: 0, flagged: 0 });
        const row = byDay.get(d)!;
        if (s.flagged) {
          row.flagged += 1;
          flagged += 1;
        } else row.genuine += 1;

        if (s.city) {
          if (!byCity.has(s.city)) byCity.set(s.city, { scans: 0, codes: new Set() });
          const cb = byCity.get(s.city)!;
          cb.scans += 1;
          if (s.codeId) cb.codes.add(s.codeId);
        }
        if (s.codeId) codes.add(s.codeId);
      }

      const series = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
      const cities = Array.from(byCity.entries())
        .map(([city, v]) => ({
          city: city,
          scans: v.scans,
          unique: v.codes.size,
        }))
        .sort((a, b) => b.scans - a.scans)
        .slice(0, 10);

      return {
        scanSeries: series,
        citySeries: cities,
        totalScans: raw.length,
        flaggedCount: flagged,
        uniqueCodes: codes.size,
        distinctCities: byCity.size,
      };
    }, [scans.data]);

  const flaggedRate = totalScans > 0 ? ((flaggedCount / totalScans) * 100).toFixed(1) : "0.0";

  function jumpToBank(_row: FlaggedRow) {
    navigate({ to: "/batches" });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Scan patterns, geographic distribution, and flagged review queue."
        action={
          <div className="hidden items-center gap-2 sm:flex">
            <span className="eyebrow">Range</span>
            <div className="flex rounded-lg bg-muted p-1">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPreset(p.key)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    preset === p.key
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p.label.replace("Last ", "")}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="panel grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
        <div className="space-y-1.5 lg:col-span-2">
          <Label htmlFor="an-prod">
            <BarChart3 className="mr-1 inline size-3" /> Filter by product
          </Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger id="an-prod">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {products.data?.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2 lg:hidden">
          <Label>
            <CalendarDays className="mr-1 inline size-3" /> Date range
          </Label>
          <div className="flex rounded-lg bg-muted p-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPreset(p.key)}
                className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                  preset === p.key
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {p.label.replace("Last ", "")}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3 justify-end">
          <p className="text-xs text-muted-foreground">
            Showing data from{" "}
            <strong className="text-foreground">
              {new Date(Date.now() - days * 864e5).toLocaleDateString()}
            </strong>{" "}
            to today
          </p>
        </div>
      </div>

      {scans.isPending ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="panel h-28 animate-pulse p-5" />
          ))}
        </div>
      ) : scans.isError ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-sans text-lg font-bold text-slate-900">Couldn't load scan data</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            {scans.error instanceof Error ? scans.error.message : "Failed to load scans."}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
            This usually means the Firestore scans index isn't deployed yet. Run{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
              firebase deploy --only firestore:indexes
            </code>{" "}
            from the repo root, then retry.
          </p>
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => scans.refetch()}>
            Retry
          </Button>
        </div>
      ) : totalScans === 0 ? (
        <EmptyState
          title="No scan activity yet"
          description="Once customers scan your verification codes, insights will appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total scans"
              value={totalScans.toLocaleString()}
              hint={`Across ${uniqueCodes.toLocaleString()} unique codes`}
            />
            <StatCard
              label="Flagged rate"
              value={`${flaggedRate}%`}
              hint={`${flaggedCount.toLocaleString()} suspicious scans`}
            />
            <StatCard
              label="Unique codes scanned"
              value={uniqueCodes.toLocaleString()}
              hint="Distinct QR codes seen"
            />
            <StatCard
              label="Distinct cities"
              value={distinctCities.toLocaleString()}
              hint="Locations of scanners"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-lg">Scans over time</CardTitle>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="size-3.5" />
                  {PRESETS.find((p) => p.key === preset)?.label}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={scanSeries}
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
                        allowDecimals={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: "var(--radius-lg)",
                          border: "1px solid var(--color-border)",
                          background: "var(--color-card)",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
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
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="size-4 text-cyan" /> Top 10 cities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={citySeries}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: -4, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(0.235 0.04 260 / 0.08)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        stroke="oklch(0.53 0.04 255)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <YAxis
                        type="category"
                        dataKey="city"
                        stroke="oklch(0.53 0.04 255)"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={90}
                      />
                      <Tooltip
                        cursor={{ fill: "oklch(0.235 0.04 260 / 0.04)" }}
                        contentStyle={{
                          borderRadius: "var(--radius-lg)",
                          border: "1px solid var(--color-border)",
                          background: "var(--color-card)",
                          fontSize: 12,
                        }}
                        formatter={(v: number, n: string) => [
                          v.toLocaleString(),
                          n === "scans" ? "Scans" : "Unique codes",
                        ]}
                      />
                      <Bar dataKey="scans" name="Scans" radius={[0, 4, 4, 0]} barSize={14}>
                        {citySeries.map((_, i) => (
                          <Cell
                            key={i}
                            fill={
                              [
                                "var(--color-chart-1)",
                                "var(--color-chart-2)",
                                "var(--color-chart-3)",
                                "var(--color-chart-4)",
                              ][i % 4]
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {citySeries.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No city data yet (location must be granted by the scanner's browser).
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="size-4 text-invalid" />
                Flagged codes review
                {flaggedCodes.data?.length ? (
                  <span className="ml-1 rounded-full bg-invalid/10 px-2 py-0.5 text-xs font-medium text-invalid">
                    {flaggedCodes.data.length}
                  </span>
                ) : null}
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link to="/batches">
                  Open code bank <ChevronRight className="size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {flaggedCodes.isLoading ? (
                <div className="h-64 animate-pulse rounded-lg border" />
              ) : !flaggedCodes.data?.length ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="grid size-12 place-items-center rounded-full bg-genuine/10 text-genuine">
                    <ScanEye className="size-6" />
                  </div>
                  <p className="mt-3 font-medium">All clear</p>
                  <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                    No flagged codes in the selected range. When a code is scanned too many times or
                    from unusual locations, it will appear here for your review.
                  </p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Scan count</TableHead>
                        <TableHead className="text-right">Cities</TableHead>
                        <TableHead>Review status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flaggedCodes.data.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">
                            <Flag className="mr-1.5 inline size-3.5 text-invalid align-middle" />
                            {r.code_string}
                          </TableCell>
                          <TableCell>{r.product_name}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.scan_count.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {r.cities_count.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={r.review_status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => jumpToBank(r)}>
                              View in bank
                              <ArrowRight className="size-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
