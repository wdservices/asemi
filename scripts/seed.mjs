/**
 * Seed script for the Asemi Firestore backend (runs with firebase-admin).
 *
 * Usage (run from functions/ so firebase-admin resolves):
 *   1. Firebase console → Project settings → Service accounts → Generate new
 *      private key → save as scripts/service-account.json (GITIGNORED — never commit).
 *   2. cd functions && GOOGLE_APPLICATION_CREDENTIALS=../scripts/service-account.json \
 *        node ../scripts/seed.mjs --admin-uid <FIREBASE_AUTH_UID> [--demo-company-uid <UID>]
 *
 * What it does:
 *   - Creates roles/{adminUid} = { role: "admin" } (first platform admin).
 *   - Optionally creates a demo approved company + wallet + one product so the
 *     dashboard has something to show. Real codes should be minted through the
 *     real registration → approval → batch flow, not this script.
 */
import admin from "firebase-admin";
import { readFile } from "node:fs/promises";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ""), true];
  }),
);

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error("Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON path.");
  process.exit(1);
}
if (!args["admin-uid"]) {
  console.error("Missing --admin-uid=<FIREBASE_AUTH_UID> (create the user in Auth first).");
  process.exit(1);
}

const saRaw = await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8");
const sa = JSON.parse(saRaw);

admin.initializeApp({
  credential: admin.credential.cert(sa),
  projectId: sa.project_id,
  storageBucket: `${sa.project_id}.firebasestorage.app`,
});

const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

await db.collection("roles").doc(args["admin-uid"]).set({ role: "admin" });
console.log(`roles/${args["admin-uid"]} → admin`);

if (args["demo-company-uid"]) {
  const uid = args["demo-company-uid"];
  await db.collection("companies").doc(uid).set({
    ownerId: uid,
    name: "Sterling Pharma Ltd",
    email: "compliance@sterling-pharma.com",
    phone: "+234 800 000 0000",
    address: "Lagos, Nigeria",
    category: "Pharmaceutical",
    registrationNumber: "RC-849201",
    countryCode: "NG",
    status: "approved",
    logoUrl: null,
    documentUrl: null,
    adminNote: "Seeded demo company",
    aiConfidence: null,
    aiFlags: [],
    freeCodesUsed: 0,
    totalCodesGenerated: 0,
    batchSeq: 0,
    approvedAt: now,
    createdAt: now,
    updatedAt: now,
  });
  await db.collection("companies").doc(uid).collection("wallet").doc("summary").set({
    creditBalance: 0,
    lifetimeTopup: 0,
    lifetimeSpent: 0,
    currency: "NGN",
    updatedAt: now,
  });
  await db.collection("products").add({
    companyId: uid,
    name: "Herbal Care Antiseptic Soap",
    sku: "HCAS-001",
    category: "Personal care",
    description: "Seeded demo product for dashboard previews.",
    imageUrls: [],
    lotNumber: "LOT-2026-0001",
    mfgDate: "2026-01-15",
    expiryDate: "2028-01-15",
    coaDocName: null,
    coaDocUrl: null,
    regulatoryNumber: null,
    regulatoryDocName: null,
    regulatoryDocUrl: null,
    certificateOfAnalysisName: null,
    certificateOfAnalysisUrl: null,
    createdAt: now,
  });
  console.log(`Demo company + wallet + product seeded for ${uid}`);
}

console.log("Seed complete.");
process.exit(0);
