// Client-side mirror of functions/src/pricing.ts — byte-for-byte the same math.
// Used ONLY as a fallback preview when the `calculateprice` callable is
// unreachable (functions not deployed). The server re-prices at checkout and
// its number always wins; this just keeps the page usable offline.

import { COUNTRIES, getCountryByCode } from "./countries";
import type { PriceQuoteResult } from "./db";

export const FREE_CODES = 20;
const TIER_CAPS = [5000, 20000, 100000, 500000, 1000000];
const CONTACT_SALES_THRESHOLD = 1_000_000;

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function mirrorPrice(
  qty: number,
  countryCode: string,
  totalCodesGenerated: number,
  freeCodesUsed: number,
): PriceQuoteResult {
  const { currency, symbol, tiers } = serverTierTable(countryCode);

  const total = Number.isFinite(totalCodesGenerated) ? totalCodesGenerated : 0;
  const used = Number.isFinite(freeCodesUsed) ? freeCodesUsed : 0;
  const free = Math.min(qty, Math.max(0, FREE_CODES - used));
  const remaining = qty - free;
  const paidSoFar = Math.max(0, total - used);

  if (paidSoFar + remaining > CONTACT_SALES_THRESHOLD) {
    return {
      requiresQuote: true,
      currency,
      symbol,
      free,
      paid: remaining,
      price: 0,
      breakdown: [],
    };
  }

  let price = 0;
  let pos = paidSoFar;
  let left = remaining;
  const breakdown: PriceQuoteResult["breakdown"] = [];
  if (free > 0) {
    breakdown.push({ label: "Free codes applied", qty: free, rate: 0, subtotal: 0 });
  }
  for (let i = 0; i < TIER_CAPS.length && left > 0; i++) {
    const cap = (TIER_CAPS[i] as number) - pos;
    if (cap <= 0) continue;
    const take = Math.min(left, cap);
    const rate = tiers[i] as number;
    const subtotal = take * rate;
    price += subtotal;
    breakdown.push({
      label: `Tier ${i + 1} (${currency} ${rate}/code)`,
      qty: take,
      rate,
      subtotal,
    });
    left -= take;
    pos += take;
  }

  return {
    requiresQuote: false,
    currency,
    symbol,
    free,
    paid: remaining,
    price: roundMoney(price),
    breakdown,
  };
}

/** Tier schedule for a country — mirrors regionFor() in functions/src/pricing.ts. */
export function serverTierTable(countryCode: string): {
  currency: string;
  symbol: string;
  tiers: [number, number, number, number, number];
} {
  const cc = (countryCode || "").toUpperCase();
  if (cc === "NG") {
    return { currency: "NGN", symbol: "₦", tiers: [50, 40, 30, 20, 12] };
  }
  if (COUNTRIES.some((c) => c.code.toUpperCase() === cc)) {
    const info = getCountryByCode(cc);
    const b = info.ratePerCode;
    return {
      currency: info.currency,
      symbol: info.currencySymbol,
      tiers: [b * 4.2, b * 3.3, b * 2.5, b * 1.6, b],
    };
  }
  return { currency: "USD", symbol: "$", tiers: [0.15, 0.12, 0.1, 0.07, 0.05] };
}

/** True for transport-level callable failures (function missing / offline). */
export function isMissingFunctionError(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? "";
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return (
    /functions\/(not-found|internal|unavailable|unknown)/i.test(code) ||
    /not-found|404|does not exist|failed to fetch|network|cors|load failed/i.test(msg)
  );
}
