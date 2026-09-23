import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import QRCode from "qrcode";
import PDFDocument from "pdfkit";
import { calculatePrice, regionFor, roundMoney } from "./pricing";
import { generateUniqueCodeStrings, buildBatchNumber } from "./codes";

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
// generateBatchPaid (callable, authenticated)
// (1) pricing + wallet deduction + batch/invoice creation in ONE transaction
// (2) chunked bulk code creation via writeBatch (500/chunk) with progress
// (3) refund + failed status if generation aborts partway
// ---------------------------------------------------------------------------

export const generatebatchpaid = onCall({ timeoutSeconds: 3600, memory: "1GiB" }, async (req) => {
  const uid = uidOf(req);
  const resumeBatchId: string | undefined = req.data?.resumeBatchId;

  const { id: companyId, data: company } = await getOwnCompany(uid);
  if (company.status !== "approved") {
    throw new HttpsError(
      "failed-precondition",
      "Company must be approved before generating paid batches.",
    );
  }

  let batchId: string;
  let batchNumber: string;
  let productId: string;
  let productName = "";
  let qty: number;
  let price = 0;
  let currency = regionFor(company.countryCode).currency;
  let free = 0;
  let lotNumber: string | null = null;
  let mfgDate: string | null = null;
  let expiryDate: string | null = null;
  let coaDocName: string | null = null;
  let coaDocUrl: string | null = null;

  if (resumeBatchId) {
    // Resume an interrupted generation from its cursor.
    const bsnap = await db.collection("batches").doc(resumeBatchId).get();
    if (!bsnap.exists || bsnap.data()?.companyId !== companyId) {
      throw new HttpsError("not-found", "Batch not found.");
    }
    const b = bsnap.data()!;
    if (b.status !== "generating" && b.status !== "failed") {
      throw new HttpsError("failed-precondition", "Only interrupted batches can be resumed.");
    }
    batchId = bsnap.id;
    batchNumber = b.batchNumber;
    productId = b.productId;
    productName = b.productName || "";
    qty = b.quantity;
    price = b.amountCharged;
    currency = b.currency;
    free = b.freeCodesApplied || 0;
    lotNumber = b.lotNumber ?? null;
    mfgDate = b.mfgDate ?? null;
    expiryDate = b.expiryDate ?? null;
    coaDocName = b.coaDocName ?? null;
    coaDocUrl = b.coaDocUrl ?? null;
    await db
      .collection("batches")
      .doc(batchId)
      .update({ status: "generating", failedAt: FieldValue.delete() });
  } else {
    productId = String(req.data?.productId || "");
    qty = assertQty(req.data?.quantity);
    lotNumber = req.data?.lotNumber ?? null;
    mfgDate = req.data?.mfgDate ?? null;
    expiryDate = req.data?.expiryDate ?? null;
    coaDocName = req.data?.coaDocName ?? null;
    coaDocUrl = req.data?.coaDocUrl ?? null;
    if (!productId) throw new HttpsError("invalid-argument", "productId is required.");

    const psnap = await db.collection("products").doc(productId).get();
    if (!psnap.exists || psnap.data()?.companyId !== companyId) {
      throw new HttpsError("not-found", "Product not found.");
    }
    productName = psnap.data()?.name || "";

    const quote = calculatePrice(
      qty,
      company.countryCode,
      company.totalCodesGenerated,
      company.freeCodesUsed,
    );
    if (quote.requiresQuote) {
      throw new HttpsError(
        "failed-precondition",
        "Volume exceeds 1,000,000 lifetime codes — contact sales for a custom quote.",
      );
    }
    price = roundMoney(quote.price);
    currency = quote.currency;
    free = quote.free;

    const batchRef = db.collection("batches").doc();
    batchId = batchRef.id;

    await db.runTransaction(async (tx) => {
      const cRef = db.collection("companies").doc(companyId);
      const wRef = db.collection("companies").doc(companyId).collection("wallet").doc("summary");
      const [cSnap, wSnap] = await Promise.all([tx.get(cRef), tx.get(wRef)]);
      const live = cSnap.data() as CompanyDoc;
      if (live.status !== "approved") {
        throw new HttpsError(
          "failed-precondition",
          "Company must be approved before generating paid batches.",
        );
      }
      const balance = wSnap.exists ? Number(wSnap.data()?.creditBalance || 0) : 0;
      if (balance < price) {
        throw new HttpsError(
          "failed-precondition",
          `Insufficient wallet balance. Top up ${(price - balance).toFixed(2)} ${currency} more.`,
        );
      }
      const seq = Number(live.batchSeq || 0) + 1;
      batchNumber = buildBatchNumber(live.name, seq);

      tx.set(
        wRef,
        {
          creditBalance: roundMoney(balance - price),
          lifetimeSpent: roundMoney(Number(wSnap.data()?.lifetimeSpent || 0) + price),
          lifetimeTopup: Number(wSnap.data()?.lifetimeTopup || 0),
          currency,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      tx.update(cRef, {
        totalCodesGenerated: (live.totalCodesGenerated || 0) + qty,
        freeCodesUsed: (live.freeCodesUsed || 0) + free,
        batchSeq: seq,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.set(batchRef, {
        companyId,
        productId,
        productName,
        batchNumber,
        quantity: qty,
        amountCharged: price,
        currency,
        freeCodesApplied: free,
        status: "generating",
        generationProgress: 0,
        lotNumber,
        mfgDate,
        expiryDate,
        coaDocName,
        coaDocUrl,
        exportedAt: null,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.set(db.collection("companies").doc(companyId).collection("invoices").doc(), {
        kind: "purchase",
        reference: batchNumber,
        amount: price,
        codesApplied: qty,
        currency,
        status: "paid",
        description: `Batch ${batchNumber} — ${qty.toLocaleString()} codes for ${productName}`,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  }

  // (2) Chunked bulk code creation — resumable via existing-code cursor.
  try {
    const existing = await db
      .collection("codes")
      .where("batchId", "==", batchId!)
      .select("codeString")
      .get();
    const seen = new Set(existing.docs.map((d) => d.data().codeString as string));
    let created = seen.size;
    while (created < qty!) {
      const take = Math.min(CODE_CHUNK, qty! - created);
      const strings = generateUniqueCodeStrings(take, seen);
      const wb = db.batch();
      for (const s of strings) {
        const ref = db.collection("codes").doc();
        wb.set(ref, {
          batchId: batchId!,
          productId,
          companyId,
          codeString: s,
          codeLookup: s.replace(/[^A-Z0-9]/gi, "").toUpperCase(),
          scanCount: 0,
          flagged: false,
          reviewStatus: "none",
          printCount: 0,
          exportedAt: null,
          lastScannedAt: null,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
      await wb.commit();
      created += take;
      await db
        .collection("batches")
        .doc(batchId!)
        .update({
          generationProgress: created / qty!,
        });
    }
    await db.collection("batches").doc(batchId!).update({ status: "ready", generationProgress: 1 });
  } catch (err) {
    // (3) Refund the wallet transactionally and mark the batch failed (resumable).
    try {
      await db.runTransaction(async (tx) => {
        const cRef = db.collection("companies").doc(companyId);
        const wRef = db.collection("companies").doc(companyId).collection("wallet").doc("summary");
        const [cSnap, wSnap] = await Promise.all([tx.get(cRef), tx.get(wRef)]);
        const live = cSnap.data() as CompanyDoc;
        const balance = Number(wSnap.data()?.creditBalance || 0);
        tx.set(
          wRef,
          {
            creditBalance: roundMoney(balance + price!),
            lifetimeSpent: roundMoney(
              Math.max(0, Number(wSnap.data()?.lifetimeSpent || 0) - price!),
            ),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        tx.update(cRef, {
          totalCodesGenerated: Math.max(0, (live.totalCodesGenerated || 0) - qty!),
          freeCodesUsed: Math.max(0, (live.freeCodesUsed || 0) - free!),
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.update(db.collection("batches").doc(batchId!), {
          status: "failed",
          failedAt: FieldValue.serverTimestamp(),
        });
      });
    } catch (refundErr) {
      console.error("Refund after failed generation also failed:", refundErr);
    }
    throw new HttpsError(
      "internal",
      `Code generation failed partway and was refunded. Resume with resumeBatchId=${batchId}.`,
    );
  }

  return {
    batchId: batchId!,
    batchNumber: batchNumber!,
    quantity: qty!,
    price,
    currency,
    free,
    status: "ready",
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
  const company = cSnap.data() as CompanyDoc;
  const region = regionFor(company.countryCode);

  const wRef = cRef.collection("wallet").doc("summary");
  const batch = db.batch();
  batch.update(cRef, {
    status: "approved",
    adminNote: note,
    approvedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  // Creating the wallet here makes approval the only path that mints it.
  batch.set(
    wRef,
    {
      creditBalance: 0,
      lifetimeTopup: 0,
      lifetimeSpent: 0,
      currency: region.currency,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();
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

export const topupwallet = onCall(async (req) => {
  const uid = uidOf(req);
  await assertAdmin(uid);
  const companyId = String(req.data?.companyId || "");
  const amount = Number(req.data?.amount);
  const reference = String(req.data?.reference || `TOPUP-${Date.now()}`);
  if (!companyId) throw new HttpsError("invalid-argument", "companyId is required.");
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new HttpsError("invalid-argument", "amount must be a positive number.");
  }
  const cRef = db.collection("companies").doc(companyId);
  const wRef = cRef.collection("wallet").doc("summary");
  const result = await db.runTransaction(async (tx) => {
    const [cSnap, wSnap] = await Promise.all([tx.get(cRef), tx.get(wRef)]);
    if (!cSnap.exists) throw new HttpsError("not-found", "Company not found.");
    const currency = wSnap.exists
      ? String(
          wSnap.data()?.currency || regionFor((cSnap.data() as CompanyDoc).countryCode).currency,
        )
      : regionFor((cSnap.data() as CompanyDoc).countryCode).currency;
    const balance = wSnap.exists ? Number(wSnap.data()?.creditBalance || 0) : 0;
    const topup = wSnap.exists ? Number(wSnap.data()?.lifetimeTopup || 0) : 0;
    tx.set(
      wRef,
      {
        creditBalance: roundMoney(balance + amount),
        lifetimeTopup: roundMoney(topup + amount),
        lifetimeSpent: Number(wSnap.data()?.lifetimeSpent || 0),
        currency,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    tx.set(cRef.collection("invoices").doc(), {
      kind: "topup",
      reference,
      amount: roundMoney(amount),
      codesApplied: 0,
      currency,
      status: "paid",
      description: `Wallet top-up ${reference}`,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { creditBalance: roundMoney(balance + amount), currency };
  });
  return { ok: true, companyId, ...result };
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
