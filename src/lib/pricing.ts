export type PricingBreakdown = {
  label: string;
  qty: number;
  rate: number;
  subtotal: number;
};

export type PricingResult = {
  totalPrice: number;
  freeCodesUsed: number;
  freeCodesRemaining: number;
  totalCodesAfter: number;
  breakdown: PricingBreakdown[];
};

export const TIERS = [
  { upTo: 5000, rate: 150 },
  { upTo: 20000, rate: 120 },
  { upTo: Infinity, rate: 100 },
];

export function formatNaira(n: number) {
  return "₦" + n.toLocaleString("en-NG");
}

export function calculatePriceLocal(
  qty: number,
  totalGeneratedSoFar: number,
  freeCodesRemaining: number,
): PricingResult & { breakdown: PricingBreakdown[] } {
  let price = 0;
  let remaining = qty;
  const freeUsed = Math.min(remaining, freeCodesRemaining);
  remaining -= freeUsed;
  let position = totalGeneratedSoFar + freeUsed;
  const breakdown: PricingBreakdown[] = [];

  if (freeUsed > 0) {
    breakdown.push({ label: "Free codes applied", qty: freeUsed, rate: 0, subtotal: 0 });
  }

  for (const tier of TIERS) {
    if (remaining <= 0) break;
    const bracketCapacity = tier.upTo - position;
    if (bracketCapacity <= 0) continue;
    const inTier = Math.min(remaining, bracketCapacity);
    const subtotal = inTier * tier.rate;
    breakdown.push({
      label: `${inTier.toLocaleString()} codes @ ₦${tier.rate}`,
      qty: inTier,
      rate: tier.rate,
      subtotal,
    });
    price += subtotal;
    remaining -= inTier;
    position += inTier;
  }

  return {
    totalPrice: price,
    freeCodesUsed: freeUsed,
    freeCodesRemaining: freeCodesRemaining - freeUsed,
    totalCodesAfter: position,
    breakdown,
  };
}
