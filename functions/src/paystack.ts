/**
 * Direct pay-per-batch via Paystack (no wallet).
 *
 * Flow: initializebatchpayment (onCall) prices server-side, creates the batch
 * in `awaiting_payment` holding state + a pending invoice, and returns a
 * Paystack authorizationUrl the client redirects to. Payment confirmation
 * converges on fulfillBatchPayment via paystackwebhook (primary) or
 * verifypaystacktransaction (client fallback), then runCodeGeneration creates
 * the codes. resumebatchgeneration resumes paid-but-unfinished batches.
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, FieldPath } from "firebase-admin/firestore";
import { onCall, HttpsError, onRequest } from "firebase-functions/v2/https";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import { calculatePrice, regionFor, roundMoney } from "./pricing";
import { buildBatchNumber } from "./codes";
import { runCodeGeneration } from "./batchGeneration";

if (!getApps().length) initializeApp();
const db = getFirestore();

const APP_URL = process.env.APP_URL || "https://asemi-c14ac.web.app";

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

function uidOf(req: { auth?: { uid: string } | null }): string {
  if (!req.auth?.uid) {
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  }
  return req.auth.uid;
}

function paystackSecret(): string {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    throw new HttpsError(
      "failed-precondition",
      "Paystack is not configured on the server (missing PAYSTACK_SECRET_KEY).",
    );
  }
  return secret;
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

function newReference(): string {
  return `ASM-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

interface PaystackVerifyData {
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
}

async function paystackApi(path: string, init?: RequestInit): Promise<PaystackVerifyData> {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${paystackSecret()}` },
  });
  if (!res.ok) {
    throw new HttpsError("unavailable", "Could not reach Paystack. Please try again.");
  }
  const body = (await res.json()) as { data?: PaystackVerifyData };
  return body?.data || {};
}

// ---------------------------------------------------------------------------
// initializebatchpayment (onCall) — price, hold, invoice, Paystack checkout
// ---------------------------------------------------------------------------

export const initializebatchpayment = onCall(async (req) => {
  const uid = uidOf(req);
  const csnap = await db.collection("companies").doc(uid).get();
  if (!csnap.exists) {
    throw new HttpsError("not-found", "No company registered for this account.");
  }
  const company = csnap.data() as CompanyDoc;
  if (company.status !== "approved") {
    throw new HttpsError(
      "failed-precondition",
      "Company must be approved before generating paid batches.",
    );
  }

  const productId = String(req.data?.productId || "");
  const qty = assertQty(req.data?.quantity);
  const tagFormat = req.data?.tagFormat === "circle" ? "circle" : "rectangle";
  if (!productId) throw new HttpsError("invalid-argument", "productId is required.");

  const psnap = await db.collection("products").doc(productId).get();
  if (!psnap.exists || psnap.data()?.companyId !== csnap.id) {
    throw new HttpsError("not-found", "Product not found.");
  }
  const productName = String(psnap.data()?.name || "");

  // Server-side re-price — the client number is never trusted.
  const quote = calculatePrice(qty, company.countryCode, company.totalCodesGenerated, company.freeCodesUsed);
  if (quote.requiresQuote) {
    throw new HttpsError(
      "failed-precondition",
      "Volume exceeds 1,000,000 lifetime codes — contact sales for a custom quote.",
    );
  }
  const price = roundMoney(quote.price);
  const currency = quote.currency;
  void regionFor(company.countryCode);

  const reference = newReference();
  const callbackUrl = `${APP_URL}/batches?reference=${encodeURIComponent(reference)}`;
  const email = String(company.email || "");
  if (!email.includes("@")) {
    throw new HttpsError("failed-precondition", "Company email is missing. Update your profile.");
  }

  const batchRef = db.collection("batches").doc();
  const invoiceRef = db.collection("companies").doc(csnap.id).collection("invoices").doc(reference);

  // Holding state: no codes, no totals touched. Abandoned checkouts are harmless.
  await db.runTransaction(async (tx) => {
    tx.set(batchRef, {
      companyId: csnap.id,
      productId,
      productName,
      batchNumber: null,
      quantity: qty,
      amountCharged: price,
      currency,
      tagFormat,
      freeCodesApplied: quote.free,
      status: "awaiting_payment",
      generationProgress: 0,
      lotNumber: req.data?.lotNumber ?? null,
      mfgDate: req.data?.mfgDate ?? null,
      expiryDate: req.data?.expiryDate ?? null,
      coaDocName: req.data?.coaDocName ?? null,
      coaDocUrl: req.data?.coaDocUrl ?? null,
      paymentReference: reference,
      paymentVerified: false,
      paymentGateway: "paystack",
      paystackAuthorizationUrl: null,
      exportedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.set(invoiceRef, {
      kind: "purchase",
      reference,
      batchId: batchRef.id,
      amount: price,
      codesApplied: qty,
      currency,
      status: "pending",
      paymentGateway: "paystack",
      description: `Batch hold — ${qty.toLocaleString()} codes for ${productName}`,
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  // Open the Paystack transaction for the exact server-computed price.
  const initRes = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${paystackSecret()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount: Math.round(price * 100),
      currency,
      reference,
      callback_url: callbackUrl,
      metadata: { companyId: csnap.id, batchId: batchRef.id, productId, productName, quantity: qty },
    }),
  });
  if (!initRes.ok) {
    throw new HttpsError("unavailable", "Could not start the Paystack checkout. Please try again.");
  }
  const initBody = (await initRes.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };
  const authorizationUrl = initBody?.data?.authorization_url;
  if (!initBody?.status || !authorizationUrl) {
    throw new HttpsError(
      "unavailable",
      `Paystack refused the transaction: ${initBody?.message || "unknown error"}.`,
    );
  }
  await batchRef.update({ paystackAuthorizationUrl: authorizationUrl });

  return {
    batchId: batchRef.id,
    reference,
    authorizationUrl,
    amount: price,
    currency,
    free: quote.free,
  };
});

// ---------------------------------------------------------------------------
// Shared fulfillment — idempotent, converges webhook + fallback
// ---------------------------------------------------------------------------

export async function fulfillBatchPayment(
  reference: string,
  source: "webhook" | "verify",
): Promise<{ batchId: string; status: string; alreadyFulfilled: boolean }> {
  const invQuery = db.collectionGroup("invoices").where(FieldPath.documentId(), "==", reference).limit(1);
  const invSnap = await invQuery.get();
  if (invSnap.empty) {
    throw new HttpsError("not-found", "No invoice matches this payment reference.");
  }
  const invDoc = invSnap.docs[0]!;
  const invoice = invDoc.data();
  const companyId = String(invoice.companyId || invDoc.ref.parent.parent?.id || "");
  const batchId = String(invoice.batchId || "");
  if (!batchId) {
    throw new HttpsError("failed-precondition", "Invoice is not linked to a batch.");
  }

  // Atomic state flip — only the first caller wins.
  const result = await db.runTransaction(async (tx) => {
    const invTx = await tx.get(invDoc.ref);
    const inv = invTx.data()!;
    if (inv.status === "paid") {
      return { alreadyFulfilled: true as boolean };
    }
    const cRef = db.collection("companies").doc(companyId);
    const bRef = db.collection("batches").doc(batchId);
    const [cSnap, bSnap] = await Promise.all([tx.get(cRef), tx.get(bRef)]);
    if (!cSnap.exists || !bSnap.exists) {
      throw new HttpsError("not-found", "Company or batch not found.");
    }
    const live = cSnap.data() as CompanyDoc;
    const batch = bSnap.data()!;
    if (String(batch.companyId) !== companyId) {
      throw new HttpsError("permission-denied", "Batch does not belong to this invoice.");
    }
    const qty = Number(batch.quantity || 0);
    const free = Number(batch.freeCodesApplied || 0);
    const seq = Number(live.batchSeq || 0) + 1;
    const batchNumber = buildBatchNumber(live.name, seq);

    tx.update(cRef, {
      totalCodesGenerated: (live.totalCodesGenerated || 0) + qty,
      freeCodesUsed: (live.freeCodesUsed || 0) + free,
      batchSeq: seq,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(bRef, {
      batchNumber,
      status: "generating",
      generationProgress: 0,
      paymentVerified: true,
      paidAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(invDoc.ref, {
      status: "paid",
      reference: batchNumber,
      description: `Batch ${batchNumber} — ${qty.toLocaleString()} codes for ${String(batch.productName || "")}`,
      paidAt: FieldValue.serverTimestamp(),
    });
    return { alreadyFulfilled: false as boolean };
  });

  // Code generation runs outside the transaction (chunked bulk writes).
  const bSnap = await db.collection("batches").doc(batchId).get();
  const status = String(bSnap.data()?.status || "generating");
  if (!result.alreadyFulfilled || status === "generating" || status === "failed") {
    try {
      await runCodeGeneration(batchId);
    } catch (err) {
      console.error(`runCodeGeneration failed for batch ${batchId} (source: ${source}):`, err);
    }
  }
  const final = await db.collection("batches").doc(batchId).get();
  return {
    batchId,
    status: String(final.data()?.status || "unknown"),
    alreadyFulfilled: result.alreadyFulfilled,
  };
}

// ---------------------------------------------------------------------------
// paystackwebhook (onRequest) — primary confirmation path
// ---------------------------------------------------------------------------

export const paystackwebhook = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      res.status(405).send("method not allowed");
      return;
    }
    const signature = String(req.headers["x-paystack-signature"] || "");
    const raw = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(req.body || {});
    const expected = createHmac("sha512", paystackSecret()).update(raw).digest("hex");
    const sigBuf = Buffer.from(signature, "utf8");
    const expBuf = Buffer.from(expected, "utf8");
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      res.status(401).send("invalid signature");
      return;
    }
    const event = (req.body || {}) as { event?: string; data?: { reference?: string } };
    if (event.event !== "charge.success") {
      res.status(200).send("ignored");
      return;
    }
    const reference = String(event.data?.reference || "");
    if (!reference) {
      res.status(400).send("missing reference");
      return;
    }
    await fulfillBatchPayment(reference, "webhook");
    res.status(200).send("ok");
  } catch (err) {
    console.error("paystackwebhook failed:", err);
    res.status(500).send("error");
  }
});

// ---------------------------------------------------------------------------
// verifypaystacktransaction (onCall) — client fallback after redirect
// ---------------------------------------------------------------------------

export const verifypaystacktransaction = onCall(async (req) => {
  uidOf(req);
  const reference = String(req.data?.reference || "").trim();
  if (!reference) {
    throw new HttpsError("invalid-argument", "Payment reference is required.");
  }
  const data = await paystackApi(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (data.status !== "success") {
    throw new HttpsError("failed-precondition", "Payment was not successful.");
  }
  const out = await fulfillBatchPayment(data.reference || reference, "verify");
  return { verified: true, ...out, amount: data.amount, currency: data.currency };
});

// ---------------------------------------------------------------------------
// resumebatchgeneration (onCall, owner or admin) — finish paid-but-unfinished
// ---------------------------------------------------------------------------

export const resumebatchgeneration = onCall(async (req) => {
  const uid = uidOf(req);
  const batchId = String(req.data?.batchId || "");
  if (!batchId) throw new HttpsError("invalid-argument", "batchId is required.");

  const bSnap = await db.collection("batches").doc(batchId).get();
  if (!bSnap.exists) throw new HttpsError("not-found", "Batch not found.");
  const batch = bSnap.data()!;
  const companyId = String(batch.companyId || "");

  const rolesSnap = await db.collection("roles").doc(uid).get();
  const admin = rolesSnap.exists && rolesSnap.data()?.role === "admin";
  if (companyId !== uid && !admin) {
    throw new HttpsError("permission-denied", "Not your batch.");
  }
  if (batch.status !== "generating" && batch.status !== "failed") {
    throw new HttpsError("failed-precondition", "Only interrupted batches can be resumed.");
  }
  // Only resume batches that were actually paid for.
  const reference = String(batch.paymentReference || "");
  if (reference) {
    const invSnap = await db
      .collectionGroup("invoices")
      .where(FieldPath.documentId(), "==", reference)
      .limit(1)
      .get();
    const inv = invSnap.docs[0]?.data();
    if (!inv || inv.status !== "paid") {
      throw new HttpsError("failed-precondition", "Batch has no confirmed payment.");
    }
  }
  try {
    await runCodeGeneration(batchId);
  } catch (err) {
    console.error(`resumebatchgeneration failed for ${batchId}:`, err);
    throw new HttpsError("internal", "Resume failed partway — try again.");
  }
  const final = await db.collection("batches").doc(batchId).get();
  return { batchId, status: String(final.data()?.status || "unknown") };
});
