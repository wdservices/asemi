import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { calculatePrice, regionFor, roundMoney } from "./pricing";
import { generateUniqueCodeStrings, buildBatchNumber } from "./codes";

// ---------------------------------------------------------------------------
// Direct pay-per-batch via Paystack (no wallet) — implemented in paystack.ts
// ---------------------------------------------------------------------------
export {
  initializebatchpayment,
  paystackwebhook,
  verifypaystacktransaction,
  resumebatchgeneration,
} from "./paystack";

initializeApp();
const db = getFirestore();

const APP_URL = process.env.APP_URL || "https://asemi-c14ac.web.app";
const CODE_CHUNK = 500; // Firestore writeBatch limit

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uidOf(req: { auth?: { uid: string } | null }): string {
  if (!req.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  }
  return req.auth.uid;
}

async function isAdmin(uid: string): Promise<boolean> {
  const snap = await db.collection("roles").doc(uid).get();
  return snap.exists && snap.data()?.role === "admin";
}

async function assertAdmin(uid: string): Promise<void> {
  if (!(await isAdmin(uid))) {
    throw new HttpsError("permission-denied", "Admin clearance required.");
  }
}

interface CompanyDoc {
  ownerId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  category?: string;
  registrationNumber: string;
  countryCode: string;
  status: "pending" | "approved" | "needs_info" | "rejected";
  freeCodesUsed: number;
  totalCodesGenerated: number;
  batchSeq?: number;
}

async function getOwnCompany(uid: string): Promise<{ id: string; data: CompanyDoc }> {
  const snap = await db.collection("companies").doc(uid).get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "No company registered for this account.");
  }
  return { id: snap.id, data: snap.data() as CompanyDoc };
}

function assertQty(qty: unknown): number {
  const n = typeof qty === "string" ? parseInt(qty, 10) : (qty as number);
  if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
    throw new HttpsError(
      "invalid-argument",
      "Quantity must be an integer between 1 and 1,000,000.",
    );
  }
  return n;
}

// ---------------------------------------------------------------------------
// calculatePrice (callable, authenticated) — live dashboard preview
// ---------------------------------------------------------------------------

export const calculateprice = onCall(async (req) => {
  const uid = uidOf(req);
  const qty = assertQty(req.data?.quantity);
  const { data: company } = await getOwnCompany(uid);
  const quote = calculatePrice(
    qty,
    company.countryCode,
    company.totalCodesGenerated,
    company.freeCodesUsed,
  );
  return {
    requiresQuote: quote.requiresQuote,
    currency: quote.currency,
    symbol: quote.symbol,
    free: quote.free,
    paid: quote.paid,
    price: roundMoney(quote.price),
    breakdown: quote.breakdown.map((r) => ({ ...r, subtotal: roundMoney(r.subtotal) })),
  };
});

// ---------------------------------------------------------------------------
// verifyCode (callable, PUBLIC) — consumer scan endpoint with fraud scoring.
// Ported from SQL verify_code; never trust the client to compute this.
// ---------------------------------------------------------------------------

interface VerifyInput {
  code?: string;
  browserToken?: string | null;
  city?: string | null;
  country?: string | null;
  deviceFingerprint?: string | null;
}

export const verifycode = onCall(async (req) => {
  const input = (req.data || {}) as VerifyInput;
  const raw = String(input.code || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (!raw) return { status: "invalid" as const };

  // Match stored codes by stripped lookup regardless of dashes/prefix style.
  const lookup = raw;
  let codeSnap = await db.collection("codes").where("codeLookup", "==", lookup).limit(1).get();
  if (codeSnap.empty && raw.length === 12) {
    const dashed = raw.replace(/(.{4})(?=.)/g, "$1-");
    codeSnap = await db.collection("codes").where("codeString", "==", dashed).limit(1).get();
  }
  if (codeSnap.empty) return { status: "invalid" as const };

  const codeDoc = codeSnap.docs[0]!;
  const code = codeDoc.data();
  const token: string | null = input.browserToken ?? null;
  const city: string | null = input.city ?? null;
  const country: string | null = input.country ?? null;
  const fp: string | null = input.deviceFingerprint ?? null;

  const scansSnap = await db
    .collection("codes")
    .doc(codeDoc.id)
    .collection("scans")
    .select("browserToken", "city", "scannedAt")
    .limit(5000)
    .get();
  const now = Date.now();
  const tokens = new Set<string>();
  const cities = new Set<string>();
  let distinctTokens = 0;
  let distinctCities = 0;
  let recent = 0;
  for (const s of scansSnap.docs) {
    const d = s.data();
    const t = (d.browserToken ?? null) as string | null;
    const c = (d.city ?? null) as string | null;
    // IS DISTINCT FROM semantics: NULL equals NULL, so same-null is excluded.
    if (t !== token && !tokens.has(t ?? "__null__")) {
      tokens.add(t ?? "__null__");
      distinctTokens++;
    }
    if (c !== null && c !== city && !cities.has(c)) {
      cities.add(c);
      distinctCities++;
    }
    const ts = d.scannedAt as Timestamp | undefined;
    if (ts && now - ts.toMillis() < 24 * 3600 * 1000) recent++;
  }

  const scanCount = Number(code.scanCount || 0) + 1;
  let status: "genuine" | "genuine_repeated" = "genuine";
  if (scanCount >= 3 && (distinctTokens >= 1 || distinctCities >= 1)) {
    status = "genuine_repeated";
  }
  let flag = false;
  if (distinctCities >= 2 || (scanCount >= 5 && distinctTokens >= 2) || recent >= 6) {
    flag = true;
  }

  const scanRef = db.collection("codes").doc(codeDoc.id).collection("scans").doc();
  const codeUpdate: Record<string, unknown> = {
    scanCount,
    lastScannedAt: FieldValue.serverTimestamp(),
  };
  if (flag) {
    codeUpdate.flagged = true;
    if ((code.reviewStatus || "none") === "none") codeUpdate.reviewStatus = "open";
  }
  await Promise.all([
    scanRef.set({
      codeId: codeDoc.id,
      codeString: code.codeString,
      companyId: String(code.companyId),
      productId: String(code.productId),
      batchId: code.batchId ? String(code.batchId) : null,
      browserToken: token,
      city,
      country,
      deviceFingerprint: fp,
      flagged: flag,
      scannedAt: FieldValue.serverTimestamp(),
    }),
    codeDoc.ref.update(codeUpdate),
  ]);

  const [productSnap, companySnap, batchSnap] = await Promise.all([
    db.collection("products").doc(String(code.productId)).get(),
    db.collection("companies").doc(String(code.companyId)).get(),
    code.batchId ? db.collection("batches").doc(String(code.batchId)).get() : Promise.resolve(null),
  ]);
  const product = productSnap.exists ? productSnap.data()! : {};
  const company = companySnap.exists ? companySnap.data()! : {};
  const batch = batchSnap && batchSnap.exists ? batchSnap.data()! : {};
  const images: string[] = Array.isArray(product.imageUrls) ? product.imageUrls : [];

  return {
    status,
    code: code.codeString,
    scan_count: scanCount,
    product: {
      name: product.name || "Unlisted product",
      category: product.category || "",
      description: product.description || "",
      image: images[0] || null,
      images,
      lotNumber: product.lotNumber ?? batch.lotNumber ?? null,
      mfgDate: product.mfgDate ?? batch.mfgDate ?? null,
      expiryDate: product.expiryDate ?? batch.expiryDate ?? null,
      regulatoryNumber: product.regulatoryNumber ?? null,
      regulatoryDocName: product.regulatoryDocName ?? null,
      regulatoryDocUrl: product.regulatoryDocUrl ?? null,
      certificateOfAnalysisName: product.certificateOfAnalysisName ?? null,
      certificateOfAnalysisUrl: product.certificateOfAnalysisUrl ?? null,
      coaDocName: product.coaDocName ?? batch.coaDocName ?? null,
      coaDocUrl: product.coaDocUrl ?? batch.coaDocUrl ?? null,
    },
    company: { name: company.name || "Unverified manufacturer", logo: company.logoUrl || null },
    batch: {
      number: batch.batchNumber || String(code.batchId),
      produced_at:
        batch.createdAt instanceof Timestamp ? batch.createdAt.toDate().toISOString() : null,
      lotNumber: batch.lotNumber ?? product.lotNumber ?? null,
    },
  };
});

// ---------------------------------------------------------------------------
// Admin functions (callable, admin-only via roles/{uid})
// ---------------------------------------------------------------------------

export const adminapprovecompany = onCall(async (req) => {
  const uid = uidOf(req);
  await assertAdmin(uid);
  const companyId = String(req.data?.companyId || "");
  const note: string | null = req.data?.note ?? null;
  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required.");

  const cRef = db.collection("companies").doc(companyId);
  const cSnap = await cRef.get();
  if (!cSnap.exists) throw new HttpsError("not-found", "Company not found.");

  await cRef.update({
    status: "approved",
    adminNote: note,
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, companyId };
});

export const adminrejectcompany = onCall(async (req) => {
  const uid = uidOf(req);
  await assertAdmin(uid);
  const companyId = String(req.data?.companyId || "");
  const note: string | null = req.data?.note ?? null;
  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required.");
  await db.collection("companies").doc(companyId).update({
    status: "rejected",
    adminNote: note,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, companyId };
});

export const adminrequestinfo = onCall(async (req) => {
  const uid = uidOf(req);
  await assertAdmin(uid);
  const companyId = String(req.data?.companyId || "");
  const note: string | null = req.data?.note ?? null;
  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required.");
  await db.collection("companies").doc(companyId).update({
    status: "needs_info",
    adminNote: note,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { ok: true, companyId };
});

export const adminreviewreport = onCall(async (req) => {
  const uid = uidOf(req);
  await assertAdmin(uid);
  const reportId = String(req.data?.reportId || "");
  const reviewed = req.data?.reviewed !== false;
  if (!reportId) throw new HttpsError("invalid-argument", "reportId is required.");
  await db.collection("reports").doc(reportId).update({ reviewed });
  return { ok: true, reportId, reviewed };
});

export const markcodesexported = onCall(async (req) => {
  const uid = uidOf(req);
  const batchId = String(req.data?.batchId || "");
  if (!batchId) throw new HttpsError("invalid-argument", "batchId is required.");
  const admin = await isAdmin(uid);

  const bRef = db.collection("batches").doc(batchId);
  const bSnap = await bRef.get();
  if (!bSnap.exists) throw new HttpsError("not-found", "Batch not found.");
  const b = bSnap.data()!;
  if (!admin) {
    const { data: company } = await getOwnCompany(uid);
    void company;
    if (b.companyId !== uid) {
      throw new HttpsError("permission-denied", "Not your batch.");
    }
  }
  // Chunked: printCount+1 and exportedAt on every code in the batch.
  let updated = 0;
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = db.collection("codes").where("batchId", "==", batchId).limit(CODE_CHUNK);
    if (last) q = q.startAfter(last) as typeof q;
    const snap = await q.get();
    if (snap.empty) break;
    const wb = db.batch();
    for (const d of snap.docs) {
      wb.update(d.ref, {
        printCount: Number(d.data().printCount || 0) + 1,
        exportedAt: FieldValue.serverTimestamp(),
      });
    }
    await wb.commit();
    updated += snap.size;
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < CODE_CHUNK) break;
  }
  await bRef.update({ status: "exported", exportedAt: FieldValue.serverTimestamp() });
  return { ok: true, batchId, codesUpdated: updated };
});

export const setcodereview = onCall(async (req) => {
  const uid = uidOf(req);
  await assertAdmin(uid);
  const codeId = String(req.data?.codeId || "");
  const status = String(req.data?.status || "");
  if (!codeId) throw new HttpsError("invalid-argument", "codeId is required.");
  if (status !== "reviewed" && status !== "escalated") {
    throw new HttpsError("invalid-argument", "status must be reviewed or escalated.");
  }
  const update: Record<string, unknown> = { reviewStatus: status };
  if (status === "escalated") update.flagged = true;
  await db.collection("codes").doc(codeId).update(update);
  return { ok: true, codeId, status };
});

// ---------------------------------------------------------------------------
// exportBatch (callable, owner or admin) — CSV + printable QR label PDF.
// Re-runnable any number of times; delegates counter updates to the same
// logic as markCodesExported. PDF capped at 10k codes; CSV is complete.
// ---------------------------------------------------------------------------

const PDF_CODE_CAP = 10_000;

export const exportbatch = onCall({ timeoutSeconds: 540, memory: "1GiB" }, async (req) => {
  const uid = uidOf(req);
  const batchId = String(req.data?.batchId || "");
  if (!batchId) throw new HttpsError("invalid-argument", "batchId is required.");
  const admin = await isAdmin(uid);

  const bSnap = await db.collection("batches").doc(batchId).get();
  if (!bSnap.exists) throw new HttpsError("not-found", "Batch not found.");
  const b = bSnap.data()!;
  const companyId = String(b.companyId);
  if (!admin && companyId !== uid) {
    throw new HttpsError("permission-denied", "Not your batch.");
  }

  await db
    .collection("batches")
    .doc(batchId)
    .update({
      exportStatus: { state: "running", progress: 0 },
    });

  // Page through all code strings.
  const codeStrings: string[] = [];
  let last: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = db
      .collection("codes")
      .where("batchId", "==", batchId)
      .select("codeString")
      .orderBy("codeString")
      .limit(1000);
    if (last) q = q.startAfter(last) as typeof q;
    const snap = await q.get();
    if (snap.empty) break;
    for (const d of snap.docs) codeStrings.push(String(d.data().codeString));
    last = snap.docs[snap.docs.length - 1];
    await db
      .collection("batches")
      .doc(batchId)
      .update({
        exportStatus: { state: "running", progress: 0.2 },
      });
    if (snap.size < 1000) break;
  }
  void APP_URL;

  const bucket = getStorage().bucket();
  const basePath = `exports/${companyId}/${batchId}`;

  // CSV: codeString + verification URL per row.
  const csvLines = ["code_string,verification_url"];
  for (const s of codeStrings) {
    csvLines.push(
      `${s},${process.env.APP_URL || "https://asemi-c14ac.web.app"}/v/${encodeURIComponent(s)}`,
    );
  }
  const csvFile = bucket.file(`${basePath}/codes.csv`);
  await csvFile.save(csvLines.join("\n"), { contentType: "text/csv", resumable: false });

  // PDF label sheet (capped).
  const pdfCodes = codeStrings.slice(0, PDF_CODE_CAP);
  const pdfBuffer = await buildLabelPdf(pdfCodes, String(b.batchNumber || batchId));
  const pdfFile = bucket.file(`${basePath}/labels.pdf`);
  await pdfFile.save(pdfBuffer, { contentType: "application/pdf", resumable: false });

  const expires = Date.now() + 7 * 24 * 3600 * 1000;
  const [csvUrl] = await csvFile.getSignedUrl({ action: "read", expires });
  const [pdfUrl] = await pdfFile.getSignedUrl({ action: "read", expires });

  // Same counter updates as markCodesExported.
  let updated = 0;
  let last2: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = db.collection("codes").where("batchId", "==", batchId).limit(CODE_CHUNK);
    if (last2) q = q.startAfter(last2) as typeof q;
    const snap = await q.get();
    if (snap.empty) break;
    const wb = db.batch();
    for (const d of snap.docs) {
      wb.update(d.ref, {
        printCount: Number(d.data().printCount || 0) + 1,
        exportedAt: FieldValue.serverTimestamp(),
      });
    }
    await wb.commit();
    updated += snap.size;
    last2 = snap.docs[snap.docs.length - 1];
    if (snap.size < CODE_CHUNK) break;
  }
  await db
    .collection("batches")
    .doc(batchId)
    .update({
      status: "exported",
      exportedAt: FieldValue.serverTimestamp(),
      exportStatus: { state: "done", progress: 1, codes: codeStrings.length },
    });

  return {
    ok: true,
    batchId,
    totalCodes: codeStrings.length,
    pdfCodes: pdfCodes.length,
    pdfCapped: codeStrings.length > PDF_CODE_CAP,
    codesUpdated: updated,
    csvUrl,
    pdfUrl,
  };
});

async function buildLabelPdf(codeStrings: string[], batchLabel: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 36,
      info: { Title: `Asemi labels — ${batchLabel}` },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const cols = 4;
    const rows = 7;
    const pageW = 595 - 72;
    const cellW = pageW / cols;
    const qrSize = 92;
    const perPage = cols * rows;

    const run = async () => {
      for (let i = 0; i < codeStrings.length; i++) {
        const idx = i % perPage;
        if (i > 0 && idx === 0) doc.addPage();
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = 36 + col * cellW + (cellW - qrSize) / 2;
        const y = 36 + row * 104;
        const s = codeStrings[i]!;
        try {
          const png = await QRCode.toBuffer(s, { width: 220, margin: 1 });
          doc.image(png, x, y, { width: qrSize, height: qrSize });
        } catch {
          doc.rect(x, y, qrSize, qrSize).stroke();
        }
        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#111111")
          .text(s, 36 + col * cellW, y + qrSize + 2, { width: cellW, align: "center" });
      }
      doc.end();
    };
    run().catch(reject);
  });
}

// ---------------------------------------------------------------------------
// AI-assisted document review (Storage trigger — structured stub).
// Runs after a registration doc lands in verification-docs/, writes
// aiConfidence/aiFlags for the admin queue. NEVER approves.
// ---------------------------------------------------------------------------

export const oncompanydocuploaded = onObjectFinalized(
  { bucket: process.env.VERIFICATION_DOCS_BUCKET, timeoutSeconds: 300, memory: "512MiB" },
  async (event) => {
    const path = event.data.name || "";
    const m = path.match(/^verification-docs\/([^/]+)\//);
    if (!m) return;
    const companyId = m[1]!;
    // TODO: drop in a real vision/OCR call here (e.g. Cloud Vision
    // documentTextDetection on the file) and cross-check the extracted
    // registration number + company name against the companies/{id} doc.
    await db
      .collection("companies")
      .doc(companyId)
      .update({
        aiConfidence: 0,
        aiFlags: [
          {
            type: "manual_review",
            detail: "Automated vision check is not configured yet — queued for human review.",
          },
        ],
        updatedAt: FieldValue.serverTimestamp(),
      });
  },
);
