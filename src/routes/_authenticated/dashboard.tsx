/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMyCompany, type Company } from "@/lib/auth";
import {
  countCollection,
  formatMoney,
  getWallet,
  listBatches,
  listCompanyScans,
  listProducts,
} from "@/lib/db";
import { EmptyState, PageHeader, StatCard } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PackagePlus, FileCode, ReceiptText, TrendingUp, Flag, Package } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Asemi" }] }),
  component: DashboardOverview,
});

type Stats = {
  products: number;
  codes: number;
  scans_month: number;
  flagged: number;
  codes_month: number;
};

function DashboardOverview() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;

  const stats = useQuery({
    queryKey: ["company-stats", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<Stats> => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const [products, codes, scans, batches] = await Promise.all([
        countCollection("products", companyId!),
        countCollection("codes", companyId!),
        listCompanyScans(companyId!, new Date(Date.now() - 30 * 864e5).toISOString()),
        listBatches(companyId!, 100),
      ]);
      const codesMonth = batches
        .filter((b) => new Date(b.createdAt) >= monthStart)
        .reduce((sum, b) => sum + b.quantity, 0);
      return {
        products,
        codes,
        scans_month: scans.length,
        flagged: scans.filter((x) => x.flagged).length,
        codes_month: codesMonth,
      };
    },
  });

  const wallet = useQuery({
    queryKey: ["wallet", companyId],
    enabled: !!companyId,
    queryFn: () => getWallet(companyId!),
  });

  const recentProducts = useQuery({
    queryKey: ["recent-products", companyId],
    enabled: !!companyId,
    queryFn: async () => (await listProducts(companyId!)).slice(0, 5),
  });

  const recentBatches = useQuery({
    queryKey: ["recent-batches", companyId],
    enabled: !!companyId,
    queryFn: async () => (await listBatches(companyId!, 5)),
  });

  const scanSeries = useQuery({
    queryKey: ["scan-series", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const scans = await listCompanyScans(
        companyId!,
        new Date(Date.now() - 30 * 864e5).toISOString(),
      );
      const byDay = new Map<string, { day: string; genuine: number; flagged: number }>();
      for (const s of scans) {
        const d = new Date(s.scannedAt).toISOString().slice(0, 10);
        if (!byDay.has(d)) byDay.set(d, { day: d.slice(5), genuine: 0, flagged: 0 });
        const row = byDay.get(d)!;
        if (s.flagged) row.flagged += 1;
        else row.genuine += 1;
      }
      return Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));
    },
  });

  const s = stats.data;
  const freeUsed = company?.freeCodesUsed ?? 0;
  const freeRemain = Math.max(0, 20 - freeUsed);
  const walletCurrency = wallet.data?.currency ?? "USD";

  if (!s) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="panel h-28 animate-pulse p-5" />
        ))}
      </div>
    );
  }

  if (s.products === 0) {
    return (
      <>
        <PageHeader
          title="Welcome to Asemi"
          description="Create your first product to start generating verification codes."
        />
        <EmptyState
          title="No products yet"
          description="Add a product first, then request a batch of unique QR codes. Each code links directly to this product on the public verification page."
          action={
            <Button asChild>
              <Link to="/products">
                <PackagePlus className="mr-2 size-4" /> Create your first product
              </Link>
            </Button>
          }
        />
      </>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={`A snapshot of ${company?.name ?? "your brand"} on Asemi.`}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/batches">
                <FileCode className="mr-2 size-4" /> New batch
              </Link>
            </Button>
            <Button asChild>
              <Link to="/products">
                <PackagePlus className="mr-2 size-4" /> New product
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Products listed" value={s.products} />
        <StatCard
          label="Codes generated"
          value={s.codes.toLocaleString()}
          hint={`Batches this month: ${s.codes_month.toLocaleString()}`}
        />
        <StatCard
          label="Scans (30d)"
          value={s.scans_month.toLocaleString()}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Flagged scans"
          value={s.flagged.toLocaleString()}
          hint="Review in Analytics"
          icon={<Flag className="size-4 text-caution" />}
        />
        <StatCard
          label="Wallet balance"
          value={formatMoney(wallet.data?.creditBalance ?? 0, walletCurrency)}
          hint={`Free codes: ${freeRemain}/20 left`}
          icon={<ReceiptText className="size-4" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Scans over the last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={scanSeries.data ?? []}
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
            <CardTitle className="text-lg">Recent products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentProducts.data?.length ? (
              recentProducts.data.map((p: any) => (
                <Link
                  key={p.id}
                  to="/products"
                  className="flex items-center justify-between rounded-xl border p-3 transition hover:bg-accent/40"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-secondary">
                      <Package className="size-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium leading-tight">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.category}</p>
                    </div>
                  </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                </Link>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No products yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent batches</CardTitle>
          <Button variant="ghost" asChild size="sm">
            <Link to="/batches">View all →</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Batch</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Charged</th>
                  <th className="px-4 py-3 text-right">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                  {recentBatches.data?.length ? (
                    recentBatches.data.map((b: any) => (
                      <tr key={b.id}>
                        <td className="px-4 py-3 font-mono text-xs">{b.batchNumber}</td>
                        <td className="px-4 py-3">{b.productName}</td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {b.quantity.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {formatMoney(b.amountCharged, b.currency)}
                        </td>
                        <td className="px-4 py-3 text-right text-muted-foreground">
                          {new Date(b.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No batches yet. Request one from the Batches page.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
