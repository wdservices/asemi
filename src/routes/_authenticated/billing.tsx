/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useIsAdmin, useMyCompany, useSession, type Company } from "@/lib/auth";
import {
  fnCalculatePrice,
  fnTopupWallet,
  formatMoney,
  getWallet,
  listBatches,
  listInvoices,
} from "@/lib/db";
import { EmptyState, PageHeader, StatCard, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Wallet,
  PlusCircle,
  ReceiptText,
  Info,
  CreditCard,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing — Asemi" }] }),
  component: BillingPage,
});

type WalletRow = {
  creditBalance: number;
  lifetimeTopup: number;
  lifetimeSpent: number;
  currency: string;
};

function BillingPage() {
  const { data: session } = useSession();
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const { data: isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const companyId = company?.id;

  const wallet = useQuery({
    queryKey: ["wallet", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<WalletRow> =>
      (await getWallet(companyId!)) ?? {
        creditBalance: 0,
        lifetimeTopup: 0,
        lifetimeSpent: 0,
        currency: "USD",
      },
  });
  const currency = wallet.data?.currency ?? "USD";

  const invoices = useQuery({
    queryKey: ["invoices", companyId],
    enabled: !!companyId,
    queryFn: () => listInvoices(companyId!),
  });

  const monthToDateUsed = useQuery({
    queryKey: ["mtd-batches", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const batches = await listBatches(companyId!, 200);
      return batches
        .filter((b) => new Date(b.createdAt) >= monthStart)
        .reduce((sum, b) => sum + (b.quantity ?? 0), 0);
    },
  });

  const exampleQuote = useQuery({
    queryKey: ["price-quote", companyId, 6000],
    enabled: !!companyId,
    staleTime: 60_000,
    queryFn: () => fnCalculatePrice(6000),
  });

  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmount, setTopupAmount] = useState<string>("");
  const [topupBusy, setTopupBusy] = useState(false);

  async function handleTopup() {
    const amount = parseInt(topupAmount, 10);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setTopupBusy(true);
    try {
      if (isAdmin) {
        await fnTopupWallet(companyId!, amount, `MANUAL-ADMIN-${Date.now()}`);
        toast.success(`Wallet credited with ${formatMoney(amount, currency)}`);
      } else {
        toast.success(
          "Top-up request submitted. An admin will review and credit your wallet shortly.",
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["wallet", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["invoices", companyId] });
      setTopupOpen(false);
      setTopupAmount("");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Top-up failed");
    } finally {
      setTopupBusy(false);
    }
  }

  const plan = "Starter";
  const planLimit = 50000;
  const mtdUsed = monthToDateUsed.data ?? 0;

  const freeUsed = company?.freeCodesUsed ?? 0;
  const freeRemain = Math.max(0, 20 - freeUsed);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Manage your wallet, view pricing, and review invoices."
        action={
          <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 size-4" />
                Top up wallet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Top up wallet</DialogTitle>
                <DialogDescription>
                  Demo mode — real payment coming soon. Enter an amount to request wallet credit.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ({currency})</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={100}
                    step={100}
                    placeholder="e.g. 10000"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                  />
                  {topupAmount &&
                    !isNaN(parseInt(topupAmount, 10)) &&
                    parseInt(topupAmount, 10) > 0 && (
                      <p className="text-xs text-muted-foreground">
                        You will request{" "}
                        <span className="font-medium text-foreground">
                          {formatMoney(parseInt(topupAmount, 10), currency)}
                        </span>{" "}
                        in wallet credit.
                      </p>
                    )}
                </div>
                <div
                  className={
                    isAdmin
                      ? "rounded-lg border bg-genuine/10 p-3 text-sm"
                      : "rounded-lg border bg-caution/10 p-3 text-sm"
                  }
                >
                  <div className="flex items-start gap-2">
                    {isAdmin ? (
                      <CheckCircle2 className="mt-0.5 size-4 text-genuine" />
                    ) : (
                      <AlertCircle className="mt-0.5 size-4 text-caution-foreground" />
                    )}
                    <div>
                      <p className="font-medium">
                        {isAdmin ? "Admin direct credit" : "Requires admin approval"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin
                          ? "As an admin, this will immediately credit the wallet and create an invoice record."
                          : "This is a demo flow. An Asemi admin will review and apply your credit manually. You will be notified once it's applied."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setTopupOpen(false)} disabled={topupBusy}>
                  Cancel
                </Button>
                <Button onClick={handleTopup} disabled={topupBusy || !topupAmount}>
                  {topupBusy ? "Processing…" : isAdmin ? "Credit wallet now" : "Submit request"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Wallet className="size-4" /> Wallet balance
              </CardTitle>
              <CardDescription>Credits available for code generation batches.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setTopupOpen(true)}>
              <PlusCircle className="mr-2 size-4" /> Top up
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="eyebrow">Available credit</p>
              <p className="mt-2 font-display text-5xl font-semibold tracking-tight">
                {formatMoney(wallet.data?.creditBalance ?? 0, currency)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                You have {freeRemain} of 20 free codes remaining.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 border-t pt-4">
              <div>
                <p className="eyebrow">Lifetime topped up</p>
                <p className="mt-1 font-medium tabular-nums">
                  {formatMoney(wallet.data?.lifetimeTopup ?? 0, currency)}
                </p>
              </div>
              <div>
                <p className="eyebrow">Lifetime spent</p>
                <p className="mt-1 font-medium tabular-nums">
                  {formatMoney(wallet.data?.lifetimeSpent ?? 0, currency)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="size-4" /> Current plan
            </CardTitle>
            <CardDescription>Usage and limits this billing period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="eyebrow">Plan</p>
              <p className="mt-1 font-display text-xl font-semibold tracking-tight capitalize">
                {plan}
              </p>
            </div>
            <div className="space-y-3 border-t pt-4">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Month-to-date codes</span>
                  <span className="font-medium tabular-nums">
                    {mtdUsed.toLocaleString()} / {planLimit.toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (mtdUsed / planLimit) * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Free codes</span>
                  <span className="font-medium tabular-nums">{freeUsed} / 20 used</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-genuine transition-all"
                    style={{ width: `${(freeUsed / 20) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="size-4" /> Pricing tiers
          </CardTitle>
          <CardDescription>
            Volume-based progressive pricing. Each batch is billed across tiers based on your total
            codes generated to date.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Paid lifetime codes</th>
                  <th className="px-4 py-3 text-right">Rate per code ({currency})</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(exampleQuote.data?.breakdown ?? [])
                  .filter((r) => r.rate > 0)
                  .map((row, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 font-medium">{row.label}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular-nums">
                        {row.qty.toLocaleString()} codes
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {formatMoney(row.rate, currency)}
                      </td>
                    </tr>
                  ))}
                {!(exampleQuote.data?.breakdown ?? []).some((r) => r.rate > 0) && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                      Loading your region-locked rates…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border bg-muted/30 p-5">
            <p className="eyebrow mb-2">Worked example — your region ({currency})</p>
            <p className="text-sm text-muted-foreground">
              A request for <span className="font-medium text-foreground">6,000 codes</span> on a
              fresh account is billed as:
            </p>
            <div className="mt-4 space-y-2">
              {(exampleQuote.data?.breakdown ?? []).map((row, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm"
                >
                  <span className="text-muted-foreground">
                    {row.label}
                    {row.rate > 0 &&
                      `: ${row.qty.toLocaleString()} codes × ${formatMoney(row.rate, currency)}`}
                  </span>
                  <span className="font-medium tabular-nums">
                    {row.subtotal === 0 ? "FREE" : formatMoney(row.subtotal, currency)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <span className="font-medium">Total for 6,000 codes</span>
                <span className="font-display text-xl font-semibold tabular-nums">
                  {exampleQuote.data
                    ? formatMoney(exampleQuote.data.price, currency)
                    : "…"}
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              The first 20 codes are free — your actual charge for a 6,000-code batch would be
              5,980 codes billed across the tiers above.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ReceiptText className="size-4" /> Usage &amp; invoices
            </CardTitle>
            <CardDescription>Wallet top-ups and batch generation transactions.</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!invoices.data?.length ? (
            <EmptyState
              title="No invoices yet"
              description="Top-ups and code generation batches will appear here."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Kind</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Status</th>
                    <th className="px-4 py-3 text-right font-mono">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.data.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={
                            inv.kind === "topup"
                              ? "reviewed"
                              : inv.codesApplied > 0
                                ? "approved"
                                : "none"
                          }
                        />
                        <span className="ml-2 capitalize text-xs">
                          {inv.kind === "topup" ? "Top-up" : "Batch"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="max-w-md truncate">{inv.description ?? "—"}</p>
                        {inv.codesApplied > 0 && (
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {inv.codesApplied.toLocaleString()} codes
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums">
                        {inv.kind === "purchase" ? "-" : "+"}
                        {formatMoney(inv.amount, inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">
                        {inv.reference ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
