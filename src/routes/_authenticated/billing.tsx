import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { useMyCompany, type Company } from "@/lib/auth";
import { formatMoney, listBatches, listInvoices } from "@/lib/db";
import { getCountryByCode, COUNTRIES, type CountryInfo } from "@/lib/countries";
import { EmptyState, PageHeader, StatusBadge } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ReceiptText,
  CreditCard,
  Sparkles,
  ArrowRight,
  Calculator,
  Globe,
  Check,
  CheckCircle2,
  Package,
  Layers,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Billing & Pricing — Asemi" }] }),
  component: BillingPage,
});

export function calculateBracketEstimate(
  vol: number,
  currencyCode: string,
  countryInfo?: CountryInfo,
) {
  const isNg = currencyCode.toUpperCase() === "NGN";
  const isUsd = currencyCode.toUpperCase() === "USD";
  const symbol = countryInfo?.currencySymbol || (isNg ? "₦" : "$");

  const paidVol = Math.max(0, vol - 20);

  if (isNg) {
    let cost = 0;
    let remaining = paidVol;
    const b1 = Math.min(remaining, 5000);
    cost += b1 * 50;
    remaining -= b1;
    const b2 = Math.min(remaining, 15000);
    cost += b2 * 35;
    remaining -= b2;
    const b3 = Math.min(remaining, 80000);
    cost += b3 * 25;
    remaining -= b3;
    const b4 = Math.min(remaining, 400000);
    cost += b4 * 18;
    remaining -= b4;
    cost += remaining * 12;
    return {
      cost,
      symbol,
      currency: "NGN",
      perUnit: vol > 0 ? (cost / vol).toFixed(2) : "0.00",
      brackets: [
        { label: "1 – 5,000 codes", rate: "₦50.00 / code" },
        { label: "5,001 – 20,000 codes", rate: "₦35.00 / code" },
        { label: "20,001 – 100,000 codes", rate: "₦25.00 / code" },
        { label: "100,001 – 500,000 codes", rate: "₦18.00 / code" },
        { label: "500,000+ codes", rate: "₦12.00 / code" },
      ],
    };
  } else if (isUsd) {
    let cost = 0;
    let remaining = paidVol;
    const b1 = Math.min(remaining, 5000);
    cost += b1 * 0.15;
    remaining -= b1;
    const b2 = Math.min(remaining, 15000);
    cost += b2 * 0.1;
    remaining -= b2;
    const b3 = Math.min(remaining, 80000);
    cost += b3 * 0.08;
    remaining -= b3;
    const b4 = Math.min(remaining, 400000);
    cost += b4 * 0.06;
    remaining -= b4;
    cost += remaining * 0.05;
    return {
      cost: Math.round(cost * 100) / 100,
      symbol,
      currency: "USD",
      perUnit: vol > 0 ? (cost / vol).toFixed(3) : "0.000",
      brackets: [
        { label: "1 – 5,000 codes", rate: "$0.150 / code" },
        { label: "5,001 – 20,000 codes", rate: "$0.100 / code" },
        { label: "20,001 – 100,000 codes", rate: "$0.080 / code" },
        { label: "100,001 – 500,000 codes", rate: "$0.060 / code" },
        { label: "500,000+ codes", rate: "$0.050 / code" },
      ],
    };
  } else {
    // Other country currency scaled from country rate
    const baseRate = countryInfo?.ratePerCode || 0.1;
    let cost = 0;
    let remaining = paidVol;
    const b1 = Math.min(remaining, 5000);
    cost += b1 * baseRate;
    remaining -= b1;
    const b2 = Math.min(remaining, 15000);
    cost += b2 * (baseRate * 0.7);
    remaining -= b2;
    const b3 = Math.min(remaining, 80000);
    cost += b3 * (baseRate * 0.55);
    remaining -= b3;
    const b4 = Math.min(remaining, 400000);
    cost += b4 * (baseRate * 0.4);
    remaining -= b4;
    cost += remaining * (baseRate * 0.3);
    return {
      cost: Math.round(cost * 100) / 100,
      symbol,
      currency: currencyCode,
      perUnit: vol > 0 ? (cost / vol).toFixed(2) : "0.00",
      brackets: [
        { label: "1 – 5,000 codes", rate: `${symbol}${baseRate.toFixed(2)} / code` },
        { label: "5,001 – 20,000 codes", rate: `${symbol}${(baseRate * 0.7).toFixed(2)} / code` },
        {
          label: "20,001 – 100,000 codes",
          rate: `${symbol}${(baseRate * 0.55).toFixed(2)} / code`,
        },
        {
          label: "100,001 – 500,000 codes",
          rate: `${symbol}${(baseRate * 0.4).toFixed(2)} / code`,
        },
        { label: "500,000+ codes", rate: `${symbol}${(baseRate * 0.3).toFixed(2)} / code` },
      ],
    };
  }
}

function BillingPage() {
  const { data: company } = useMyCompany() as { data: Company | null | undefined };
  const companyId = company?.id;

  // Retrieve country selected by user during registration
  const registeredCountryCode = company?.countryCode || "NG";
  const registeredCountry = useMemo(
    () => getCountryByCode(registeredCountryCode),
    [registeredCountryCode],
  );

  // Selector defaults automatically to country's currency: Nigeria -> NGN (₦), USA -> USD ($)
  const [selectedCurrency, setSelectedCurrency] = useState<string>(() => {
    if (registeredCountryCode.toUpperCase() === "NG") return "NGN";
    if (registeredCountryCode.toUpperCase() === "US") return "USD";
    return registeredCountry.currency || "NGN";
  });

  // Sync when company data becomes available
  useEffect(() => {
    if (company?.countryCode) {
      if (company.countryCode.toUpperCase() === "NG") {
        setSelectedCurrency("NGN");
      } else if (company.countryCode.toUpperCase() === "US") {
        setSelectedCurrency("USD");
      } else {
        const c = getCountryByCode(company.countryCode);
        setSelectedCurrency(c.currency || "USD");
      }
    }
  }, [company?.countryCode]);

  const activeCountryInfo = useMemo(() => {
    const match = COUNTRIES.find((c) => c.currency === selectedCurrency);
    return match || registeredCountry;
  }, [selectedCurrency, registeredCountry]);

  // Volume slider state (defaults to 25,000 codes like interactive calculator)
  const [calculatorVolume, setCalculatorVolume] = useState<number>(25000);

  const estimate = useMemo(() => {
    return calculateBracketEstimate(calculatorVolume, selectedCurrency, activeCountryInfo);
  }, [calculatorVolume, selectedCurrency, activeCountryInfo]);

  const invoices = useQuery({
    queryKey: ["invoices", companyId],
    enabled: !!companyId,
    queryFn: () => listInvoices(companyId!),
  });

  const batches = useQuery({
    queryKey: ["batches", companyId],
    enabled: !!companyId,
    queryFn: () => listBatches(companyId!, 200),
  });

  const monthToDateUsed = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    return (batches.data ?? [])
      .filter((b) => new Date(b.createdAt) >= monthStart)
      .reduce((sum, b) => sum + (b.quantity ?? 0), 0);
  }, [batches.data]);

  const totalLifetimeCodes = useMemo(() => {
    return (batches.data ?? []).reduce((sum, b) => sum + (b.quantity ?? 0), 0);
  }, [batches.data]);

  const freeUsed = company?.freeCodesUsed ?? 0;
  const freeRemain = Math.max(0, 20 - freeUsed);

  // Common international currency options for the selector
  const currencyOptions = useMemo(() => {
    const list: { code: string; label: string; symbol: string; flag: string }[] = [];

    // 1. Registered country currency (Primary)
    list.push({
      code: registeredCountry.currency,
      label: `${registeredCountry.name} (${registeredCountry.currency})`,
      symbol: registeredCountry.currencySymbol,
      flag: registeredCountry.flag,
    });

    // 2. USD (International standard) if not already first
    if (registeredCountry.currency !== "USD") {
      list.push({
        code: "USD",
        label: "United States (USD)",
        symbol: "$",
        flag: "🇺🇸",
      });
    }

    // 3. NGN (Nigeria) if not already added
    if (registeredCountry.currency !== "NGN") {
      list.push({
        code: "NGN",
        label: "Nigeria (NGN)",
        symbol: "₦",
        flag: "🇳🇬",
      });
    }

    // 4. Regional African and international hubs
    const additional = ["GHS", "KES", "ZAR", "GBP", "EUR"];
    for (const cur of additional) {
      if (!list.some((item) => item.code === cur)) {
        const found = COUNTRIES.find((c) => c.currency === cur);
        if (found) {
          list.push({
            code: found.currency,
            label: `${found.name} (${found.currency})`,
            symbol: found.currencySymbol,
            flag: found.flag,
          });
        }
      }
    }

    return list;
  }, [registeredCountry]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Volume Pricing"
        description="Transparent volume brackets. Pay per generated batch with no recurring subscription fees."
        action={
          <Button asChild className="gap-2 bg-zinc-950 hover:bg-black text-white">
            <Link to="/batches">
              <Package className="size-4" /> Request Code Batch
            </Link>
          </Button>
        }
      />

      {/* Main Interactive Volume Calculator with Currency Selector */}
      <Card className="border-2 border-primary/20 shadow-sm overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-300 font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full mb-1.5">
                <Calculator className="size-3 text-[#caa33a]" /> Interactive Volume Calculator
              </div>
              <CardTitle className="text-xl">Volume-Tiered Investment Estimator</CardTitle>
              <CardDescription>
                Progressive discount tiers — unit price decreases as batch volume grows.
              </CardDescription>
            </div>

            {/* CURRENCY SELECTOR (Moved here from landing page, auto-picked by country during registration) */}
            <div className="flex flex-col sm:items-end gap-1.5">
              <span className="text-[11px] font-mono text-muted-foreground uppercase flex items-center gap-1">
                <Globe className="size-3" /> Select Currency / Region
              </span>
              <div className="flex flex-wrap items-center gap-1.5 bg-background p-1 border rounded-lg shadow-inner">
                {currencyOptions.map((opt) => (
                  <button
                    key={opt.code}
                    type="button"
                    onClick={() => setSelectedCurrency(opt.code)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-all ${
                      selectedCurrency === opt.code
                        ? "bg-zinc-950 text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                    title={opt.label}
                  >
                    <span>{opt.flag}</span>
                    <span>{opt.code}</span>
                    <span className="opacity-75 font-normal">({opt.symbol})</span>
                    {selectedCurrency === opt.code && <Check className="size-3 ml-0.5" />}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">
                {registeredCountry.name} detected from registration •{" "}
                {registeredCountry.currencySymbol} {registeredCountry.currency}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Slider and Volume Presets */}
            <div className="lg:col-span-7 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono uppercase font-bold text-muted-foreground">
                    Estimate Codes Volume
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Drag slider or select quick volume preset
                  </p>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-mono text-3xl font-bold tracking-tight text-foreground">
                    {calculatorVolume.toLocaleString()}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">codes</span>
                </div>
              </div>

              {/* Range slider */}
              <input
                id="volume-slider"
                type="range"
                min={500}
                max={500000}
                step={500}
                value={calculatorVolume}
                onChange={(e) => setCalculatorVolume(parseInt(e.target.value))}
                className="w-full h-2.5 bg-muted rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-zinc-100"
              />

              <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                <span>500</span>
                <span>50,000</span>
                <span>100,000</span>
                <span>500,000 codes</span>
              </div>

              {/* Quick volume buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">Quick presets:</span>
                {[1000, 5000, 25000, 50000, 100000, 500000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setCalculatorVolume(v)}
                    className={`px-2.5 py-1 text-xs font-mono rounded border transition-colors ${
                      calculatorVolume === v
                        ? "bg-primary text-primary-foreground border-primary font-bold"
                        : "hover:bg-accent text-foreground"
                    }`}
                  >
                    {v.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Investment Display Box (matches landing page calculator) */}
            <div className="lg:col-span-5 rounded-2xl border-2 border-[#caa33a]/40 bg-gradient-to-br from-amber-500/5 via-background to-amber-500/10 p-6 text-center shadow-sm">
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground font-semibold">
                Total Estimated Investment
              </div>
              <div className="text-4xl sm:text-5xl font-bold text-foreground mt-2 font-mono tracking-tight">
                {estimate.symbol}
                {estimate.cost.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold mt-2">
                Average {estimate.symbol}
                {estimate.perUnit} / unit
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                Includes tamper-evident physical security QR tags &amp; 20 free onboarding codes
              </div>

              <div className="mt-5 pt-4 border-t flex flex-col gap-2">
                <Button asChild className="w-full bg-zinc-950 hover:bg-black text-white gap-2">
                  <Link to="/batches">
                    <Sparkles className="size-4 text-[#caa33a]" /> Generate{" "}
                    {calculatorVolume.toLocaleString()} Codes
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Overview & Account Plan */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-primary" /> Current Plan
            </CardTitle>
            <CardDescription>Pay-as-you-go volume brackets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="eyebrow">Plan Type</p>
              <p className="mt-1 font-display text-2xl font-bold tracking-tight">
                Starter Manufacturer
              </p>
            </div>
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-xs text-emerald-800 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5 inline mr-1 text-emerald-600" />
              Zero recurring monthly subscription
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="size-4 text-primary" /> Code Generation Usage
            </CardTitle>
            <CardDescription>Activity in the current monthly period</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Month-to-date codes</span>
                <span className="font-medium font-mono tabular-nums">
                  {monthToDateUsed.toLocaleString()} codes
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${Math.min(100, (monthToDateUsed / 50000) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Complimentary onboarding</span>
                <span className="font-medium font-mono tabular-nums">{freeUsed} / 20 used</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-emerald-500 transition-all"
                  style={{ width: `${(freeUsed / 20) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {freeRemain > 0
                  ? `${freeRemain} free onboarding codes remaining`
                  : "All free codes utilized"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="size-4 text-primary" /> Production Metrics
            </CardTitle>
            <CardDescription>All-time cryptographic packaging output</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="eyebrow">Lifetime Codes Generated</p>
              <p className="mt-1 font-mono text-3xl font-bold tracking-tight">
                {totalLifetimeCodes.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="eyebrow">Total Completed Batches</p>
              <p className="mt-1 font-mono text-xl font-semibold">
                {(batches.data?.length ?? 0).toLocaleString()} batches
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Tiers Table for Selected Currency */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calculator className="size-4 text-primary" /> Volume Pricing Brackets (
                {selectedCurrency})
              </CardTitle>
              <CardDescription>
                Unit rates automatically adjust across progressive volume brackets.
              </CardDescription>
            </div>
            <div className="font-mono text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded">
              Currency: {estimate.symbol} {estimate.currency}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground font-mono">
                <tr>
                  <th className="px-4 py-3">Volume Tier Bracket</th>
                  <th className="px-4 py-3">Code Range</th>
                  <th className="px-4 py-3 text-right">Unit Rate ({selectedCurrency})</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {estimate.brackets.map((tier, idx) => (
                  <tr key={idx} className={idx === 0 ? "bg-muted/10" : ""}>
                    <td className="px-4 py-3 font-medium">Tier {idx + 1}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{tier.label}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums text-foreground">
                      {tier.rate}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border bg-muted/30 p-5">
            <p className="eyebrow mb-2">
              Progressive Tier Calculation Example ({selectedCurrency})
            </p>
            <p className="text-sm text-muted-foreground">
              A batch of <span className="font-medium text-foreground">25,000 codes</span> under the{" "}
              <span className="font-semibold text-foreground">{selectedCurrency}</span> pricing
              schedule:
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">First 20 codes (onboarding allowance)</span>
                <span className="font-medium text-emerald-600 font-mono">FREE (0.00)</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">
                  First 5,000 paid codes @{" "}
                  {selectedCurrency === "NGN"
                    ? "₦50.00"
                    : selectedCurrency === "USD"
                      ? "$0.15"
                      : `${estimate.symbol}${activeCountryInfo.ratePerCode.toFixed(2)}`}
                </span>
                <span className="font-mono font-medium">
                  {selectedCurrency === "NGN"
                    ? "₦250,000.00"
                    : selectedCurrency === "USD"
                      ? "$750.00"
                      : `${estimate.symbol}${(5000 * activeCountryInfo.ratePerCode).toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">
                  Next 15,000 paid codes @{" "}
                  {selectedCurrency === "NGN"
                    ? "₦35.00"
                    : selectedCurrency === "USD"
                      ? "$0.10"
                      : `${estimate.symbol}${(activeCountryInfo.ratePerCode * 0.7).toFixed(2)}`}
                </span>
                <span className="font-mono font-medium">
                  {selectedCurrency === "NGN"
                    ? "₦525,000.00"
                    : selectedCurrency === "USD"
                      ? "$1,500.00"
                      : `${estimate.symbol}${(15000 * activeCountryInfo.ratePerCode * 0.7).toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border bg-background px-4 py-2.5 text-sm">
                <span className="text-muted-foreground">
                  Remaining 4,980 codes @{" "}
                  {selectedCurrency === "NGN"
                    ? "₦25.00"
                    : selectedCurrency === "USD"
                      ? "$0.08"
                      : `${estimate.symbol}${(activeCountryInfo.ratePerCode * 0.55).toFixed(2)}`}
                </span>
                <span className="font-mono font-medium">
                  {selectedCurrency === "NGN"
                    ? "₦124,500.00"
                    : selectedCurrency === "USD"
                      ? "$398.40"
                      : `${estimate.symbol}${(4980 * activeCountryInfo.ratePerCode * 0.55).toFixed(2)}`}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg border-2 border-primary/30 bg-primary/5 px-4 py-3 text-sm">
                <span className="font-semibold text-foreground">
                  Total for 25,000 codes (average{" "}
                  {selectedCurrency === "NGN"
                    ? "₦35.98"
                    : selectedCurrency === "USD"
                      ? "$0.106"
                      : `${estimate.symbol}${estimate.perUnit}`}{" "}
                  / unit)
                </span>
                <span className="font-display text-xl font-bold font-mono text-foreground">
                  {selectedCurrency === "NGN"
                    ? "₦899,500.00"
                    : selectedCurrency === "USD"
                      ? "$2,648.40"
                      : `${estimate.symbol}${estimate.cost.toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Generation Invoices & Receipts */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ReceiptText className="size-4 text-primary" /> Code Generation Invoices &amp;
              Receipts
            </CardTitle>
            <CardDescription>
              Official transaction records for generated code batches.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {!invoices.data?.length ? (
            <EmptyState
              title="No invoices yet"
              description="Invoices will be automatically issued here as code batches are generated."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left text-xs uppercase tracking-wider text-muted-foreground font-mono">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3 text-right">Codes</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-right">Status</th>
                    <th className="px-4 py-3 text-right font-mono">Batch Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.data.map((inv) => (
                    <tr key={inv.id}>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <p className="max-w-md truncate">{inv.description ?? "Batch Generation"}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-mono tabular-nums">
                        {inv.codesApplied > 0 ? `${inv.codesApplied.toLocaleString()} codes` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">
                        {formatMoney(inv.amount, inv.currency || selectedCurrency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={inv.status === "paid" ? "approved" : inv.status} />
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
