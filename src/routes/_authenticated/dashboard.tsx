/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMyCompany, useSession, type Company } from "@/lib/auth";
import {
  countCollection,
  formatMoney,
  listBatches,
  listCompanyScans,
  listProducts,
} from "@/lib/db";
import { EmptyState, PageHeader, StatCard } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PackagePlus,
  QrCode,
  TrendingUp,
  Flag,
  Package,
  ArrowRight,
  Gift,
} from "lucide-react";
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
  scansUnavailable: boolean;
};

const QUERY_OPTS = {
  staleTime: 30_000,
  gcTime: 5 * 60_000,
  retry: 1,
  refetchOnWindowFocus: false,
} as const;

function DashboardOverview() {
  const { data: session, isPending: sessionPending, isError: sessionError } = useSession();
  const {
    data: company,
    isPending: companyPending,
    isError: companyError,
    error: companyErrorObj,
    refetch: refetchCompany,
  } = useMyCompany() as {
    data: Company | null | undefined;
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => void;
  };
  const companyId = company?.id;

  const stats = useQuery({
    queryKey: ["company-stats", companyId],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: async (): Promise<Stats> => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      // Scans use a collection-group query that needs a Firestore index. If the
      // index isn't deployed yet, degrade gracefully instead of blanking the page.
      const scansPromise = listCompanyScans(
        companyId!,
        new Date(Date.now() - 30 * 864e5).toISOString(),
      ).then(
        (scans) => ({ scans, scansUnavailable: false }),
        () => ({ scans: [], scansUnavailable: true }),
      );
      const [products, codes, { scans, scansUnavailable }, batches] = await Promise.all([
        countCollection("products", companyId!),
        countCollection("codes", companyId!),
        scansPromise,
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
        scansUnavailable,
      };
    },
  });

  const recentProducts = useQuery({
    queryKey: ["recent-products", companyId],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: async () => (await listProducts(companyId!)).slice(0, 5),
  });

  const recentBatches = useQuery({
    queryKey: ["recent-batches", companyId],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: async () => await listBatches(companyId!, 5),
  });

  const scanSeries = useQuery({
    queryKey: ["scan-series", companyId],
    enabled: !!companyId,
    ...QUERY_OPTS,
    queryFn: async () => {
      let scans: Awaited<ReturnType<typeof listCompanyScans>> = [];
      try {
        scans = await listCompanyScans(
          companyId!,
          new Date(Date.now() - 30 * 864e5).toISOString(),
        );
      } catch {
        scans = [];
      }
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

  // 1. Auth still resolving → skeleton (never a blank page).
  if (sessionPending) {
    return (
      <div className="space-y-4 font-sans">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <EmptyState
        title="Session expired"
        description="Please sign in again to view your dashboard."
        action={
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/auth">Go to sign in</Link>
          </Button>
        }
      />
    );
  }

  // 2. Company still loading → skeleton.
  if (companyPending || (!company && !companyError)) {
    return (
      <div className="space-y-4 font-sans">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-2xl bg-white shadow-sm" />
      </div>
    );
  }

  if (companyError) {
    const msg =
      companyErrorObj instanceof Error ? companyErrorObj.message : "Failed to load company.";
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Overview" description="A snapshot of your brand on Asemi." />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-sans text-lg font-bold">Couldn't load your company</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{msg}</p>
          <p className="mx-auto mt-1 max-w-xl text-xs text-slate-400">
            Check your connection and Firestore permissions, then retry.
          </p>
          <Button
            className="mt-4 bg-blue-600 hover:bg-blue-700"
            onClick={() => refetchCompany()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!company || !companyId) {
    return (
      <EmptyState
        title="No company found"
        description="Your account has no company yet. Register your company to unlock the dashboard."
        action={
          <Button asChild className="bg-blue-600 hover:bg-blue-700">
            <Link to="/profile">Set up company</Link>
          </Button>
        }
      />
    );
  }

  if (stats.isPending) {
    return (
      <div className="space-y-4 font-sans">
        <div className="h-9 w-56 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (stats.isError) {
    const msg =
      stats.error instanceof Error ? stats.error.message : "Failed to load overview data.";
    const needsIndex = /index|FAILED_PRECONDITION/i.test(msg);
    return (
      <div className="space-y-6 font-sans">
        <PageHeader
          title="Overview"
          description={`A snapshot of ${company?.name ?? "your brand"} on Asemi.`}
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="font-sans text-lg font-bold">Couldn't load your overview</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{msg}</p>
          {needsIndex && (
            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
              This usually means Firestore composite indexes aren't deployed yet. Run{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                firebase deploy --only firestore:indexes
              </code>{" "}
              from the repo root, then retry.
            </p>
          )}
          <Button className="mt-4 bg-blue-600 hover:bg-blue-700" onClick={() => stats.refetch()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const s = stats.data;
  if (!s) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm" />
        ))}
      </div>
    );
  }

  if (s.products === 0) {
    return (
      <div className="font-sans">
        <PageHeader
          title={`Welcome, ${company?.name ?? "there"} 👋`}
          description="Create your first product to start generating verification codes."
        />
        <EmptyState
          title="No products yet"
          description="Add a product first, then request a batch of unique QR codes. Each code links directly to this product on the public verification page."
          action={
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/products">
                <PackagePlus className="mr-2 size-4" /> Create your first product
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const freeUsed = company?.freeCodesUsed ?? 0;
  const freeRemain = Math.max(0, 20 - freeUsed);

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title={`Overview`}
        description={`Here's what's happening at ${company?.name ?? "your brand"} — last 30 days.`}
        action={
          <div className="flex gap-2">
            <Button asChild variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
              <Link to="/batches">
                <QrCode className="mr-2 size-4" /> New batch
              </Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-700">
              <Link to="/products">
                <PackagePlus className="mr-2 size-4" /> New product
              </Link>
            </Button>
          </div>
        }
      />

      {s.scansUnavailable && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm">
          <p className="text-blue-900">
            <strong>Scan stats unavailable</strong> — Firestore index not deployed yet. Run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">
              firebase deploy --only firestore:indexes
            </code>{" "}
            from the repo root, then retry.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto border-blue-300 text-blue-700 hover:bg-blue-100"
            onClick={() => stats.refetch()}
          >
            Retry
          </Button>
        </div>
      )}
      {/* Stats — 4 simple cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Products" value={s.products} icon={<Package className="size-4" />} />
        <StatCard
          label="Codes generated"
          value={s.codes.toLocaleString()}
          hint={`${s.codes_month.toLocaleString()} this month`}
          icon={<QrCode className="size-4" />}
        />
        <StatCard
          label="Scans (30d)"
          value={s.scans_month.toLocaleString()}
          hint={`${s.flagged.toLocaleString()} flagged`}
          icon={<TrendingUp className="size-4" />}
        />
        <StatCard
          label="Free codes remaining"
          value={`${freeRemain}/20`}
          hint={
            freeRemain > 0
              ? "Applied automatically to your next batch"
              : "All used — future codes are paid"
          }
          icon={<Gift className="size-4" />}
        />
      </div>

      {s.flagged > 0 && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm">
          <Flag className="size-4 shrink-0 text-red-600" />
          <p className="text-red-900">
            <strong>{s.flagged.toLocaleString()}</strong> suspicious scans need review.
          </p>
          <Button variant="ghost" size="sm" asChild className="ml-auto text-red-700 hover:bg-red-100">
            <Link to="/analytics">
              Review <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <Card className="border-slate-200 shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-sans text-base font-bold">Scans — last 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              {scanSeries.data?.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={scanSeries.data ?? []}
                    margin={{ top: 8, right: 16, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="day"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e8f0",
                        background: "white",
                        fontSize: 12,
                        fontFamily: "Inter, sans-serif",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, fontFamily: "Inter, sans-serif" }} />
                    <Line
                      type="monotone"
                      dataKey="genuine"
                      name="Genuine"
                      stroke="#2563eb"
                      strokeWidth={2.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="flagged"
                      name="Flagged"
                      stroke="#dc2626"
                      strokeWidth={2.5}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <TrendingUp className="size-8 text-slate-300" />
                  <p className="mt-2 text-sm font-medium text-slate-600">No scans yet</p>
                  <p className="mt-1 max-w-xs text-xs text-slate-400">
                    Share your product QR codes — scan activity will appear here.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick actions + recent products */}
        <div className="space-y-6">
          <Card className="border-blue-100 bg-gradient-to-b from-blue-50/80 to-white shadow-sm">
            <CardHeader>
              <CardTitle className="font-sans text-base font-bold">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                <Link to="/batches">
                  <QrCode className="mr-2 size-4" /> Generate codes
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start border-blue-200 text-blue-700 hover:bg-blue-50"
              >
                <Link to="/products">
                  <PackagePlus className="mr-2 size-4" /> Add product
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full justify-start text-slate-600">
                <Link to="/analytics">
                  View analytics <ArrowRight className="ml-auto size-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle className="font-sans text-base font-bold">Recent products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentProducts.data?.length ? (
                recentProducts.data.map((p: any) => (
                  <Link
                    key={p.id}
                    to="/products"
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 transition hover:border-blue-200 hover:bg-blue-50/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <Package className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium leading-tight">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.category}</p>
                      </div>
                    </div>
                    <p className="shrink-0 text-xs text-slate-400">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))
              ) : (
                <p className="py-6 text-center text-sm text-slate-400">No products yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent batches */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-sans text-base font-bold">Recent batches</CardTitle>
          <Button variant="ghost" asChild size="sm" className="text-blue-700 hover:bg-blue-50">
            <Link to="/batches">View all →</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 text-right font-semibold">Quantity</th>
                  <th className="px-4 py-3 text-right font-semibold">Charged</th>
                  <th className="px-4 py-3 text-right font-semibold">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentBatches.data?.length ? (
                  recentBatches.data.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                        {b.batchNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3">{b.productName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {b.quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(b.amountCharged, b.currency)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
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
