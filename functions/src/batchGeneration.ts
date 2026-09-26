/**
 * Shared code generation worker (server side).
 *
 * Creates codes/{codeId} documents for a batch in writeBatch chunks of 500
 * (Firestore's per-batch write limit), updating generationProgress as it
 * goes. Resumable via the existing-code cursor: already-created codes are
 * skipped, so re-running is safe. On failure the batch is marked "failed"
 * (NOT refunded — real money moved through Paystack); use
 * resumebatchgeneration to finish it with no new charge.
 */
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { generateUniqueCodeStrings } from "./codes";

if (!getApps().length) initializeApp();
const db = getFirestore();

const CODE_CHUNK = 500;

export async function runCodeGeneration(batchId: string): Promise<void> {
  const bRef = db.collection("batches").doc(batchId);
  const bSnap = await bRef.get();
  if (!bSnap.exists) throw new Error(`Batch ${batchId} not found.`);
  const batch = bSnap.data()!;
  const companyId = String(batch.companyId || "");
  const productId = String(batch.productId || "");
  const qty = Number(batch.quantity || 0);
  if (!Number.isInteger(qty) || qty < 1) {
    throw new Error(`Batch ${batchId} has invalid quantity.`);
  }
  if (batch.status === "ready") return;

  try {
    const existing = await db.collection("codes").where("batchId", "==", batchId).select("codeString").get();
    const seen = new Set(existing.docs.map((d) => String(d.data().codeString)));
    let created = seen.size;

    await bRef.update({ status: "generating" });

    while (created < qty) {
      const take = Math.min(CODE_CHUNK, qty - created);
      const strings = generateUniqueCodeStrings(take, seen);
      const wb = db.batch();
      for (const s of strings) {
        const ref = db.collection("codes").doc();
        wb.set(ref, {
          batchId,
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
      await bRef.update({ generationProgress: created / qty });
    }
    await bRef.update({ status: "ready", generationProgress: 1 });
  } catch (err) {
    try {
      await bRef.update({ status: "failed", failedAt: FieldValue.serverTimestamp() });
    } catch {
      // Best effort — original error below is what matters.
    }
    throw err;
  }
}
