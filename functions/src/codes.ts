import { randomBytes } from "crypto";

/**
 * Verification code generator (matches asemiStore.ts format):
 * 8 random chars from a 32-char unambiguous alphabet + 2-char checksum,
 * formatted as ASM-XXXX-XXXXXX. Excludes 0/O/1/I to avoid misreads.
 */
const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomChars(n: number): string {
  const bytes = randomBytes(n);
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

/** Generate `n` unique code strings (intra-batch uniqueness via Set). */
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
  if (out.length < n) {
    throw new Error(`Code generation stalled: produced ${out.length}/${n} unique strings`);
  }
  return out;
}

/** Normalize a consumer-entered code to XXXX-XXXX-XXXX lookup form. */
export function normalizeLookup(input: string): string | null {
  const raw = (input || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 12);
  if (raw.length !== 12) return null;
  return raw.replace(/(.{4})(?=.)/g, "$1-");
}

/** Build the batch number: first 2 letters of company name + YYMM + seq. */
export function buildBatchNumber(companyName: string, seq: number): string {
  const letters = (companyName || "AS")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 2)
    .padEnd(2, "X");
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `${letters}-${yy}${mm}-${String(seq).padStart(3, "0")}`;
}
