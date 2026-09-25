import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  updateDoc,
  increment,
  getDoc,
  setDoc,
  addDoc,
} from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import { getCountryByCode } from "@/lib/countries";

const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomChars(n: number): string {
  const bytes = new Uint8Array(n);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = "";
  for (let i = 0; i < n; i++) {
    out += CHARSET[bytes[i]! % CHARSET.length];
  }
  return out;
}

export function generateCodeString(): string {
  const raw = randomChars(8);
  let sum = 0;
  for (const ch of raw) {
    sum = (sum * 31 + CHARSET.indexOf(ch)) % 32;
  }
  const check1 = CHARSET[sum % 32]!;
  const check2 = CHARSET[(sum * 7 + 13) % 32]!;
  const payload = raw + check1 + check2; // 10 chars
  return `ASM-${payload.slice(0, 4)}-${payload.slice(4)}`;
}

export function generateUniqueCodeStrings(n: number, existing?: Set<string>): string[] {
  const seen = existing ?? new Set<string>();
  const out: string[] = [];
  let guard = 0;
  while (out.length < n && guard < n * 20 + 1000) {
    guard++;
    const s = generateCodeString();
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function buildBatchNumber(companyName: string, seq: number): string {
  const prefix = (companyName || "AS")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 2)
    .toUpperCase()
    .padEnd(2, "X");
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const seqStr = String(seq).padStart(4, "0");
  return `${prefix}-${yy}${mm}-${seqStr}`;
}

export interface ClientCalculatePriceResult {
  requiresQuote: boolean;
  currency: string;
  symbol: string;
  free: number;
  paid: number;
  price: number;
  breakdown: { label: string; qty: number; rate: number; subtotal: number }[];
}

export function calculateBatchPrice(
  qty: number,
  countryCode: string = "NG",
  freeAvailable: number = 0,
): ClientCalculatePriceResult {
  // Currency is locked to the company's registration country (matches billing).
  const info = getCountryByCode(countryCode || "NG");
  const isNg = info.code.toUpperCase() === "NG";
  const isUsd = info.currency.toUpperCase() === "USD";
  const currency = isNg ? "NGN" : info.currency;
  const symbol = isNg ? "₦" : info.currencySymbol;

  const free = Math.min(qty, freeAvailable);
  const paid = qty - free;

  // Progressive volume brackets (matching billing page brackets)
  // NGN: 1-5k: ₦50, 5k-20k: ₦35, 20k-100k: ₦25, 100k-500k: ₦18, 500k+: ₦12
  // USD: 1-5k: $0.15, 5k-20k: $0.10, 20k-100k: $0.08, 100k-500k: $0.06, 500k+: $0.05
  // Other: base ratePerCode scaled 1 / 0.7 / 0.55 / 0.4 / 0.3
  const tiers = isNg
    ? [50, 35, 25, 18, 12]
    : isUsd
      ? [0.15, 0.1, 0.08, 0.06, 0.05]
      : [
          info.ratePerCode,
          info.ratePerCode * 0.7,
          info.ratePerCode * 0.55,
          info.ratePerCode * 0.4,
          info.ratePerCode * 0.3,
        ];
  const limits = [5000, 15000, 80000, 400000];

  let cost = 0;
  let remaining = paid;
  for (let i = 0; i < limits.length; i++) {
    const take = Math.min(remaining, limits[i] ?? 0);
    cost += take * (tiers[i] ?? 0);
    remaining -= take;
  }
  cost += remaining * (tiers[4] ?? 0);

  const price = Math.round(cost * 100) / 100;
  const effectiveRate = paid > 0 ? Math.round((price / paid) * 100) / 100 : 0;

  return {
    requiresQuote: qty >= 1_000_000,
    currency,
    symbol,
    free,
    paid,
    price,
    breakdown: [
      ...(free > 0 ? [{ label: "Complimentary Free Codes", qty: free, rate: 0, subtotal: 0 }] : []),
      ...(paid > 0
        ? [
            {
              label: `Volume Brackets (${paid.toLocaleString()} codes, avg ${symbol}${effectiveRate})`,
              qty: paid,
              rate: effectiveRate,
              subtotal: price,
            },
          ]
        : []),
    ],
  };
}

export interface GenerateBatchParams {
  companyId: string;
  companyName: string;
  countryCode?: string;
  productId: string;
  productName: string;
  quantity: number;
  amountCharged: number;
  currency: string;
  tagFormat?: "circle" | "rectangle";
  lotNumber?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  paymentReference?: string | null;
  paymentVerified?: boolean;
  onProgress?: (percent: number) => void;
}

export interface GeneratedBatchResult {
  batchId: string;
  batchNumber: string;
  quantity: number;
  codes: string[];
  tagFormat: "circle" | "rectangle";
}

export async function createBatchWithCodes(
  params: GenerateBatchParams,
): Promise<GeneratedBatchResult> {
  const db = requireDb();
  const {
    companyId,
    companyName,
    productId,
    productName,
    quantity,
    amountCharged,
    currency,
    lotNumber = null,
    mfgDate = null,
    expiryDate = null,
    paymentReference = null,
    paymentVerified = false,
    onProgress,
  } = params;

  onProgress?.(10);

  // 1. Fetch current batch sequence from company doc
  const compRef = doc(db, "companies", companyId);
  const compSnap = await getDoc(compRef);
  const currentSeq = Number(compSnap.data()?.["batchSeq"] || 0) + 1;
  const batchNumber = buildBatchNumber(companyName, currentSeq);

  onProgress?.(20);

  // 2. Generate unique code strings
  const codeStrings = generateUniqueCodeStrings(quantity);

  onProgress?.(30);

  // 3. Create Batch Document
  const batchRef = doc(collection(db, "batches"));
  const batchId = batchRef.id;

  const now = new Date();
  const batchData = {
    companyId,
    productId,
    productName,
    batchNumber,
    quantity,
    amountCharged,
    currency,
    tagFormat: params.tagFormat || "rectangle",
    freeCodesApplied: 0,
    status: "ready",
    generationProgress: 1,
    lotNumber,
    mfgDate,
    expiryDate,
    coaDocName: null,
    coaDocUrl: null,
    paymentReference,
    paymentVerified,
    paymentGateway: paymentReference ? "paystack" : "none",
    exportedAt: null,
    createdAt: serverTimestamp(),
  };

  await setDoc(batchRef, batchData);

  onProgress?.(45);

  // 4. Write Code Documents in Batches of 200
  const CHUNK_SIZE = 200;
  let written = 0;

  for (let i = 0; i < codeStrings.length; i += CHUNK_SIZE) {
    const chunk = codeStrings.slice(i, i + CHUNK_SIZE);
    const wb = writeBatch(db);

    for (const codeStr of chunk) {
      const codeRef = doc(collection(db, "codes"));
      wb.set(codeRef, {
        batchId,
        productId,
        companyId,
        codeString: codeStr,
        codeLookup: codeStr.replace(/[^A-Z0-9]/gi, "").toUpperCase(),
        scanCount: 0,
        flagged: false,
        reviewStatus: "none",
        printCount: 0,
        exportedAt: null,
        lastScannedAt: null,
        createdAt: serverTimestamp(),
      });
    }

    await wb.commit();
    written += chunk.length;
    const pct = Math.min(95, 45 + Math.round((written / quantity) * 50));
    onProgress?.(pct);
  }

  // 5. Update Company stats
  try {
    await updateDoc(compRef, {
      totalCodesGenerated: increment(quantity),
      batchSeq: currentSeq,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Could not update company batch sequence:", err);
  }

  // 6. Record Invoice
  try {
    const invoicesRef = collection(db, "companies", companyId, "invoices");
    await addDoc(invoicesRef, {
      kind: "purchase",
      reference: batchNumber,
      amount: amountCharged,
      codesApplied: quantity,
      currency,
      status: "paid",
      paymentGateway: paymentReference ? "paystack" : "none",
      paymentReference,
      paymentVerified,
      description: `Batch ${batchNumber} — ${quantity.toLocaleString()} codes for ${productName}`,
      createdAt: serverTimestamp(),
    });
  } catch (invErr) {
    console.warn("Could not record invoice:", invErr);
  }

  onProgress?.(100);

  return {
    batchId,
    batchNumber,
    quantity,
    codes: codeStrings,
    tagFormat: params.tagFormat || "rectangle",
  };
}
