/**
 * Canonical Asemi pricing engine (ported from asemiStore.ts + SQL calculate_price).
 * Single source of truth — the dashboard calls the calculatePrice Cloud Function.
 */

export const TIER_CAPS = [5000, 20000, 100000, 500000, 1000000];
export const FREE_CODES = 20;
export const CONTACT_SALES_THRESHOLD = 1_000_000;

export interface RegionPricing {
  currency: string;
  symbol: string;
  tiers: [number, number, number, number, number];
}

const NG_PRICING: RegionPricing = {
  currency: "NGN",
  symbol: "₦",
  tiers: [50, 40, 30, 20, 12],
};

const USD_PRICING: RegionPricing = {
  currency: "USD",
  symbol: "$",
  tiers: [0.15, 0.12, 0.1, 0.07, 0.05],
};

/** Tier-5 (cheapest) base rate per country — mirrors src/lib/countries.ts ratePerCode. */
const BASE_RATES: Record<string, { currency: string; symbol: string; base: number }> = {
  NG: { currency: "NGN", symbol: "₦", base: 12 },
  GH: { currency: "GHS", symbol: "₵", base: 0.12 },
  KE: { currency: "KES", symbol: "KSh", base: 1.05 },
  ZA: { currency: "ZAR", symbol: "R", base: 0.15 },
  EG: { currency: "EGP", symbol: "E£", base: 0.38 },
  RW: { currency: "RWF", symbol: "RF", base: 10.5 },
  UG: { currency: "UGX", symbol: "USh", base: 30.0 },
  TZ: { currency: "TZS", symbol: "TSh", base: 20.8 },
  ET: { currency: "ETB", symbol: "Br", base: 0.95 },
  CI: { currency: "XOF", symbol: "CFA", base: 4.8 },
  SN: { currency: "XOF", symbol: "CFA", base: 4.8 },
  CM: { currency: "XAF", symbol: "FCFA", base: 4.8 },
  MA: { currency: "MAD", symbol: "DH", base: 0.08 },
  US: { currency: "USD", symbol: "$", base: 0.008 },
  CA: { currency: "CAD", symbol: "CA$", base: 0.011 },
  MX: { currency: "MXN", symbol: "MX$", base: 0.16 },
  GB: { currency: "GBP", symbol: "£", base: 0.006 },
  DE: { currency: "EUR", symbol: "€", base: 0.007 },
  FR: { currency: "EUR", symbol: "€", base: 0.007 },
  NL: { currency: "EUR", symbol: "€", base: 0.007 },
  IT: { currency: "EUR", symbol: "€", base: 0.007 },
  ES: { currency: "EUR", symbol: "€", base: 0.007 },
  BE: { currency: "EUR", symbol: "€", base: 0.007 },
  IE: { currency: "EUR", symbol: "€", base: 0.007 },
  PT: { currency: "EUR", symbol: "€", base: 0.007 },
  AT: { currency: "EUR", symbol: "€", base: 0.007 },
  GR: { currency: "EUR", symbol: "€", base: 0.007 },
  FI: { currency: "EUR", symbol: "€", base: 0.007 },
  CH: { currency: "CHF", symbol: "CHF", base: 0.007 },
  SE: { currency: "SEK", symbol: "kr", base: 0.08 },
  NO: { currency: "NOK", symbol: "kr", base: 0.08 },
  DK: { currency: "DKK", symbol: "kr", base: 0.05 },
  PL: { currency: "PLN", symbol: "zł", base: 0.03 },
  AE: { currency: "AED", symbol: "د.إ", base: 0.03 },
  SA: { currency: "SAR", symbol: "﷼", base: 0.03 },
  QA: { currency: "QAR", symbol: "QR", base: 0.03 },
  KW: { currency: "KWD", symbol: "KD", base: 0.0025 },
  IN: { currency: "INR", symbol: "₹", base: 0.65 },
  CN: { currency: "CNY", symbol: "¥", base: 0.058 },
  JP: { currency: "JPY", symbol: "¥", base: 1.2 },
  SG: { currency: "SGD", symbol: "S$", base: 0.011 },
  AU: { currency: "AUD", symbol: "A$", base: 0.012 },
  NZ: { currency: "NZD", symbol: "NZ$", base: 0.013 },
  KR: { currency: "KRW", symbol: "₩", base: 10.8 },
  MY: { currency: "MYR", symbol: "RM", base: 0.035 },
  ID: { currency: "IDR", symbol: "Rp", base: 125.0 },
  PH: { currency: "PHP", symbol: "₱", base: 0.45 },
  TH: { currency: "THB", symbol: "฿", base: 0.28 },
  VN: { currency: "VND", symbol: "₫", base: 198.0 },
  PK: { currency: "PKR", symbol: "₨", base: 2.2 },
  BD: { currency: "BDT", symbol: "৳", base: 0.95 },
  BR: { currency: "BRL", symbol: "R$", base: 0.045 },
  AR: { currency: "ARS", symbol: "AR$", base: 8.0 },
  CL: { currency: "CLP", symbol: "CL$", base: 7.5 },
  CO: { currency: "COP", symbol: "CO$", base: 32.0 },
  PE: { currency: "PEN", symbol: "S/", base: 0.03 },
  AO: { currency: "AOA", symbol: "Kz", base: 7.0 },
  BW: { currency: "BWP", symbol: "P", base: 0.11 },
  CD: { currency: "CDF", symbol: "FC", base: 22.0 },
  DZ: { currency: "DZD", symbol: "DA", base: 1.08 },
  TN: { currency: "TND", symbol: "DT", base: 0.025 },
  ZM: { currency: "ZMW", symbol: "K", base: 0.22 },
  ZW: { currency: "USD", symbol: "$", base: 0.008 },
  MU: { currency: "MUR", symbol: "₨", base: 0.36 },
  NA: { currency: "NAD", symbol: "N$", base: 0.15 },
  TR: { currency: "TRY", symbol: "₺", base: 0.27 },
  IL: { currency: "ILS", symbol: "₪", base: 0.03 },
  HK: { currency: "HKD", symbol: "HK$", base: 0.062 },
  TW: { currency: "TWD", symbol: "NT$", base: 0.26 },
};

export function regionFor(countryCode: string): RegionPricing {
  const code = (countryCode || "").toUpperCase();
  if (code === "NG") return NG_PRICING;
  const entry = BASE_RATES[code];
  if (entry) {
    return {
      currency: entry.currency,
      symbol: entry.symbol,
      tiers: [entry.base * 4.2, entry.base * 3.3, entry.base * 2.5, entry.base * 1.6, entry.base],
    };
  }
  return USD_PRICING;
}

export interface PriceBreakdownRow {
  label: string;
  qty: number;
  rate: number;
  subtotal: number;
}

export interface PriceQuote {
  requiresQuote: boolean;
  currency: string;
  symbol: string;
  free: number;
  paid: number;
  price: number;
  breakdown: PriceBreakdownRow[];
}

export function calculatePrice(
  qty: number,
  countryCode: string,
  totalCodesGenerated: number,
  freeCodesUsed: number,
): PriceQuote {
  // Defensive: older company docs may lack these counters — NaN here would
  // silently price everything at 0. Every company gets 20 free codes.
  const total = Number.isFinite(totalCodesGenerated) ? totalCodesGenerated : 0;
  const used = Number.isFinite(freeCodesUsed) ? freeCodesUsed : 0;
  const region = regionFor(countryCode);
  const free = Math.min(qty, Math.max(0, FREE_CODES - used));
  const remaining = qty - free;
  // Free codes do NOT consume tier brackets.
  const paidSoFar = Math.max(0, total - used);

  if (paidSoFar + remaining > CONTACT_SALES_THRESHOLD) {
    return {
      requiresQuote: true,
      currency: region.currency,
      symbol: region.symbol,
      free,
      paid: remaining,
      price: 0,
      breakdown: [],
    };
  }

  let price = 0;
  let pos = paidSoFar;
  let left = remaining;
  const breakdown: PriceBreakdownRow[] = [];
  if (free > 0) {
    breakdown.push({ label: "Free codes applied", qty: free, rate: 0, subtotal: 0 });
  }
  for (let i = 0; i < TIER_CAPS.length && left > 0; i++) {
    const cap = TIER_CAPS[i]! - pos;
    if (cap <= 0) continue;
    const take = Math.min(left, cap);
    const rate = region.tiers[i]!;
    const subtotal = take * rate;
    price += subtotal;
    breakdown.push({
      label: `Tier ${i + 1} (${region.currency} ${rate}/code)`,
      qty: take,
      rate,
      subtotal,
    });
    left -= take;
    pos += take;
  }

  return {
    requiresQuote: false,
    currency: region.currency,
    symbol: region.symbol,
    free,
    paid: remaining,
    price,
    breakdown,
  };
}

/** Round to 2 decimals for money math. */
export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
