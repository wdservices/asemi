/**
 * One-off TEST helper: mint 5 verification codes for the "Sample Product" of the
 * signed-in demo company and write them straight to Firestore via the REST API.
 *
 * Auth: reuses the firebase-tools CLI refresh token (no service-account key
 * needed). This bypasses Firestore rules because the CLI account is a project
 * editor, so it is ONLY for local testing — never part of the app runtime.
 *
 *   node scripts/seed-test-codes.mjs
 *
 * Prints the created batch + codes as JSON and writes them to
 * test-artifacts/test-codes.json.
 */
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";

const PROJECT_ID = "asemi-c14ac";
const COMPANY_NAME = "Asemi Demo Brand";
const PRODUCT_NAME = "Sample Product";
const QTY = 5;
const BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// ---------------------------------------------------------------------------
// firebase-tools refresh token -> access token
// ---------------------------------------------------------------------------
const cfgPath = path.join(homedir(), ".config", "configstore", "firebase-tools.json");
const cfg = JSON.parse(await readFile(cfgPath, "utf8"));
const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
    client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
    refresh_token: cfg.tokens.refresh_token,
    grant_type: "refresh_token",
  }),
});
if (!tokenRes.ok)
  throw new Error(`token refresh failed: ${tokenRes.status} ${await tokenRes.text()}`);
const { access_token: accessToken } = await tokenRes.json();
const headers = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };

// ---------------------------------------------------------------------------
// Firestore value helpers
// ---------------------------------------------------------------------------
const S = (v) => ({ stringValue: v });
const I = (v) => ({ integerValue: String(v) });
const B = (v) => ({ booleanValue: v });
const N = () => ({ nullValue: null });
const T = (v) => ({ timestampValue: v });
const A = (v) => ({ arrayValue: { values: v } });

async function runQuery(collectionId, fieldPath, value) {
  const res = await fetch(`${BASE}:runQuery`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: { field: { fieldPath }, op: "EQUAL", value: { stringValue: value } },
        },
      },
    }),
  });
  if (!res.ok)
    throw new Error(`runQuery ${collectionId} failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  return rows.filter((r) => r.document).map((r) => r.document);
}

async function createDoc(collectionId, docId, fields) {
  const res = await fetch(`${BASE}/${collectionId}?documentId=${encodeURIComponent(docId)}`, {
    method: "POST",
    headers,
    body: JSON.stringify({ fields }),
  });
  if (!res.ok)
    throw new Error(`create ${collectionId}/${docId}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function patchDoc(docPath, fields) {
  const mask = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`)
    .join("&");
  const res = await fetch(`${BASE}/${docPath}?${mask}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`patch ${docPath}: ${res.status} ${await res.text()}`);
  return res.json();
}

const str = (doc, key) => doc.fields?.[key]?.stringValue;
const num = (doc, key) =>
  Number(doc.fields?.[key]?.integerValue ?? doc.fields?.[key]?.doubleValue ?? 0);

// ---------------------------------------------------------------------------
// Code string generator (mirrors functions/src/codes.ts)
// ---------------------------------------------------------------------------
const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function generateCodeString() {
  const bytes = randomBytes(8);
  let raw = "";
  for (let i = 0; i < 8; i++) raw += CHARSET[bytes[i] % CHARSET.length];
  let sum = 0;
  for (const ch of raw) sum = (sum * 31 + CHARSET.indexOf(ch)) % 32;
  const payload = raw + CHARSET[sum % 32] + CHARSET[(sum * 7 + 13) % 32];
  return `ASM-${payload.slice(0, 4)}-${payload.slice(4)}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const companies = await runQuery("companies", "name", COMPANY_NAME);
if (!companies.length) throw new Error(`company "${COMPANY_NAME}" not found`);
const companyDoc = companies[0];
const companyId = companyDoc.name.split("/").pop();
const companyName = str(companyDoc, "name");

const products = await runQuery("products", "companyId", companyId);
const productDoc = products.find((p) => str(p, "name") === PRODUCT_NAME);
if (!productDoc) throw new Error(`product "${PRODUCT_NAME}" not found for ${COMPANY_NAME}`);
const productId = productDoc.name.split("/").pop();
const productName = str(productDoc, "name");
const productCategory = str(productDoc, "category") || "";
const productDescription = str(productDoc, "description") || "";
const productImage = productDoc.fields?.imageUrls?.arrayValue?.values?.[0]?.stringValue || null;

// Batch number: AS-YYMM-### (next seq for this company this month)
const now = new Date();
const yy = String(now.getFullYear()).slice(2);
const mm = String(now.getMonth() + 1).padStart(2, "0");
const existingBatches = await runQuery("batches", "companyId", companyId);
const prefix = `AS-${yy}${mm}-`;
const usedSeqs = existingBatches
  .map((b) => str(b, "batchNumber") || "")
  .filter((n) => n.startsWith(prefix))
  .map((n) => Number(n.slice(prefix.length)))
  .filter((n) => Number.isFinite(n));
const seq = (usedSeqs.length ? Math.max(...usedSeqs) : 0) + 1;
const batchNumber = `${prefix}${String(seq).padStart(3, "0")}`;

const iso = now.toISOString();
const batchId = `testbatch_${Date.now()}`;
const batchFields = {
  companyId: S(companyId),
  productId: S(productId),
  productName: S(productName),
  batchNumber: S(batchNumber),
  quantity: I(QTY),
  amountCharged: I(0),
  currency: S("NGN"),
  tagFormat: S("rectangle"),
  freeCodesApplied: I(QTY),
  status: S("ready"),
  generationProgress: I(1),
  exportStatus: N(),
  paymentReference: S(`TEST-SEED-${Date.now()}`),
  paymentVerified: B(true),
  paystackAuthorizationUrl: N(),
  lotNumber: N(),
  mfgDate: N(),
  expiryDate: N(),
  coaDocName: N(),
  coaDocUrl: N(),
  exportedAt: N(),
  createdAt: T(iso),
  updatedAt: T(iso),
  createdBy: S("test-seed"),
};
await createDoc("batches", batchId, batchFields);

const codes = [];
for (let i = 0; i < QTY; i++) {
  const codeString = generateCodeString();
  const codeLookup = codeString.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const codeId = `testcode_${Date.now()}_${i}`;
  const fields = {
    batchId: S(batchId),
    productId: S(productId),
    companyId: S(companyId),
    codeString: S(codeString),
    codeLookup: S(codeLookup),
    scanCount: I(0),
    flagged: B(false),
    reviewStatus: S("none"),
    printCount: I(0),
    exportedAt: N(),
    lastScannedAt: N(),
    createdAt: T(iso),
    // Public verification snapshot (used by the client-side fallback when the
    // verifycode Cloud Function is not deployed yet).
    productName: S(productName),
    productCategory: S(productCategory),
    productDescription: S(productDescription),
    productImage: productImage ? S(productImage) : N(),
    companyName: S(companyName),
    batchNumber: S(batchNumber),
    lotNumber: N(),
    mfgDate: N(),
    expiryDate: N(),
    regulatoryNumber: N(),
    producedAt: T(iso),
  };
  await createDoc("codes", codeId, fields);
  codes.push({ id: codeId, codeString, codeLookup });
}

// Keep company counters consistent with the new free test codes.
const prevFree = num(companyDoc, "freeCodesUsed");
const prevTotal = num(companyDoc, "totalCodesGenerated");
await patchDoc(`companies/${companyId}`, {
  freeCodesUsed: I(prevFree + QTY),
  totalCodesGenerated: I(prevTotal + QTY),
  updatedAt: T(iso),
});

const out = {
  companyId,
  companyName,
  productId,
  productName,
  batchId,
  batchNumber,
  codes,
  createdAt: iso,
};
await mkdir("test-artifacts", { recursive: true });
await writeFile("test-artifacts/test-codes.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
