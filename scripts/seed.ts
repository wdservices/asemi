/**
 * Seed Asemi's Firestore (+ Auth) with demo data.
 *
 * Run against the EMULATOR first, verify, and only then against a real
 * (staging, not production) project:
 *
 *   firebase emulators:start --project asemi-c14ac  # firestore :8090, auth :9099
 *   npm --prefix functions run seed
 *
 * NOTE: the explicit --project flag is REQUIRED. Without it the emulator hub
 * can resolve a different default project, in which case Admin SDK writes
 * (explicit project) and client SDK reads (no project) land in different
 * namespaces and sign-in fails with user-not-found.
 *
 * Real project:
 *   GOOGLE_APPLICATION_CREDENTIALS=scripts/service-account.json \
 *     npm --prefix functions run seed
 *   (service-account.json is gitignored — never commit it.)
 *
 * Idempotent-safe for dev: every doc is written with .set() (full overwrite),
 * so re-runs are clean. Auth users are created-or-updated. NOTE: if this ever
 * needs to run against data you don't want clobbered, switch .set() to
 * .set(data, { merge: true }).
 *
 * Fixtures reuse the demo data from the old mock seed (Nora Consumer Goods,
 * Ivory Dental, Malomo Foods + a new rejected example), retargeted at the
 * real Firestore schema. Pricing figures are consistent with the canonical
 * engine (NG tiers [50,40,30,20,12], 20 lifetime free codes):
 *   batch2 (20 codes, all free) → 0 charged
 *   batch1 (500 codes, 0 free left) → 500 × 50 = 25,000 charged
 *   batch3 (50 codes) → 50 × 50 = 2,500 charged
 *   top-up 300,000 → spent 27,500 → balance 272,500
 */
import admin from "firebase-admin";
import { generateUniqueCodeStrings } from "../functions/src/codes";

const DEMO_PASSWORD = "asemi-demo-2026";
const CHUNK = 500; // Firestore writeBatch hard limit

const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;

if (usingEmulator) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "asemi-c14ac" });
  console.log("Target: FIRESTORE EMULATOR", process.env.FIRESTORE_EMULATOR_HOST);
} else {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("Set GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON path.");
    process.exit(1);
  }
  admin.initializeApp();
  console.log("Target: REAL PROJECT (service account)");
}

const auth = admin.auth();
const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();
const daysAgo = (d: number) => admin.firestore.Timestamp.fromDate(new Date(Date.now() - d * 864e5));
const hoursAgo = (h: number) => admin.firestore.Timestamp.fromDate(new Date(Date.now() - h * 36e5));

// ---------------------------------------------------------------------------
// Fixtures (reused demo data, real schema)
// ---------------------------------------------------------------------------

const USERS = [
  { uid: "usr_company_demo_001", email: "company@asemi.demo", name: "Nora Consumer Goods Ltd" },
  { uid: "usr_admin_demo_001", email: "admin@asemi.demo", name: "Asemi Admin" },
  { uid: "usr_pending_003", email: "pending@asemi.demo", name: "Ivory Dental Co." },
  { uid: "usr_needsinfo_004", email: "needsinfo@asemi.demo", name: "Malomo Foods Enterprise" },
];

const COMPANIES = [
  {
    id: "usr_company_demo_001",
    ownerId: "usr_company_demo_001",
    name: "Nora Consumer Goods Ltd",
    email: "hello@noracg.example",
    phone: "+234 801 234 5678",
    address: "14 Allen Avenue, Ikeja, Lagos",
    category: "Personal care",
    registrationNumber: "RC-1234567",
    countryCode: "NG",
    status: "approved",
    logoUrl: null,
    documentUrl: null,
    adminNote: null,
    aiConfidence: null,
    aiFlags: [],
    freeCodesUsed: 20,
    totalCodesGenerated: 570,
    approvedAt: daysAgo(90),
  },
  {
    id: "usr_pending_003",
    ownerId: "usr_pending_003",
    name: "Ivory Dental Co.",
    email: "contact@ivorydental.example",
    phone: "+234 802 111 2233",
    address: "20 Borno Way, Yaba, Lagos",
    category: "Oral care",
    registrationNumber: "RC-9988776",
    countryCode: "NG",
    status: "pending",
    logoUrl: null,
    documentUrl: null,
    adminNote: null,
    aiConfidence: null,
    aiFlags: [],
    freeCodesUsed: 0,
    totalCodesGenerated: 0,
    approvedAt: null,
  },
  {
    id: "usr_needsinfo_004",
    ownerId: "usr_needsinfo_004",
    name: "Malomo Foods Enterprise",
    email: "hello@malomofoods.example",
    phone: "+234 803 444 5566",
    address: "5 Adeola Odeku St, Victoria Island, Lagos",
    category: "Food & beverage",
    registrationNumber: "RC-4455667",
    countryCode: "NG",
    status: "needs_info",
    logoUrl: null,
    documentUrl: null,
    adminNote: "Please upload a clearer scan of your CAC certificate.",
    aiConfidence: 0.42,
    aiFlags: [{ type: "low_document_clarity", detail: "Registration document is blurry." }],
    freeCodesUsed: 0,
    totalCodesGenerated: 0,
    approvedAt: null,
  },
  {
    id: "usr_rejected_005",
    ownerId: "usr_rejected_005",
    name: "Balogun Beauty Mart",
    email: "hello@balogunbeauty.example",
    phone: "+233 244 555 011",
    address: "12 Oxford Street, Osu, Accra",
    category: "Cosmetics",
    registrationNumber: "RC-5550113",
    countryCode: "GH",
    status: "rejected",
    logoUrl: null,
    documentUrl: null,
    adminNote: "Unable to verify this business registration number.",
    aiConfidence: 0.31,
    aiFlags: [{ type: "registration_mismatch", detail: "Registration number not found in registry." }],
    freeCodesUsed: 0,
    totalCodesGenerated: 0,
    approvedAt: null,
  },
];

const APPROVED_ID = "usr_company_demo_001";

const PRODUCTS = [
  {
    id: "prd_seed_toothpaste",
    name: "Nora Bright Toothpaste 100g",
    sku: "NORA-BR-TP-100",
    category: "Personal care",
    description: "Fluoride toothpaste with cool mint.",
    imageUrls: ["https://picsum.photos/seed/nora-toothpaste/600/400"],
    lotNumber: "LOT-2026-1042",
    mfgDate: "2026-01-15",
    expiryDate: "2028-01-15",
    regulatoryNumber: "NAFDAC A7-1234",
  },
  {
    id: "prd_seed_shampoo",
    name: "Nora Silky Shampoo 250ml",
    sku: "NORA-SH-SH-250",
    category: "Personal care",
    description: "Sulfate-free silky shampoo for all hair types.",
    imageUrls: ["https://picsum.photos/seed/nora-shampoo/600/400"],
  },
  {
    id: "prd_seed_cocoa",
    name: "Malomo Pure Cocoa Powder 500g",
    sku: "MAL-CO-PW-500",
    category: "Food & beverage",
    description: "Unsweetened pure cocoa powder for baking and drinks.",
    imageUrls: ["https://picsum.photos/seed/nora-cocoa/600/400"],
    coaDocName: "COA-2026-0088",
  },
  {
    id: "prd_seed_cream",
    name: "Ivory Cavity Protection Cream 75ml",
    sku: "IVO-CA-CR-75",
    category: "Personal care",
    description: "Fluoride cavity protection cream for sensitive teeth.",
    imageUrls: ["https://picsum.photos/seed/nora-cream/600/400"],
  },
];

const BATCHES = [
  {
    id: "bat_seed_001",
    productId: "prd_seed_toothpaste",
    productName: "Nora Bright Toothpaste 100g",
    batchNumber: "NO-2608-001",
    quantity: 500,
    amountCharged: 25000,
    currency: "NGN",
    freeCodesApplied: 0,
    status: "exported",
    lotNumber: "LOT-2026-1042",
    mfgDate: "2026-01-15",
    expiryDate: "2028-01-15",
  },
  {
    id: "bat_seed_002",
    productId: "prd_seed_shampoo",
    productName: "Nora Silky Shampoo 250ml",
    batchNumber: "NO-2608-002",
    quantity: 20,
    amountCharged: 0,
    currency: "NGN",
    freeCodesApplied: 20,
    status: "ready",
    lotNumber: null,
    mfgDate: null,
    expiryDate: null,
  },
  {
    id: "bat_seed_003",
    productId: "prd_seed_cocoa",
    productName: "Malomo Pure Cocoa Powder 500g",
    batchNumber: "NO-2608-003",
    quantity: 50,
    amountCharged: 2500,
    currency: "NGN",
    freeCodesApplied: 0,
    status: "ready",
    lotNumber: null,
    mfgDate: null,
    expiryDate: null,
  },
];

// Scans shaped to trip verifyCode's thresholds on the NEXT verification:
// 3 distinct tokens + 4 distinct cities across 5 scans → status
// genuine_repeated (scanCount+1 >= 3 with distinct token/city) and
// flagged=true (>= 2 distinct cities).
const FRAUD_SCANS = [
  { token: "tok-seed-A", city: "Lagos", at: daysAgo(6) },
  { token: "tok-seed-B", city: "Abuja", at: daysAgo(4) },
  { token: "tok-seed-A", city: "Lagos", at: daysAgo(3) },
  { token: "tok-seed-C", city: "Port Harcourt", at: daysAgo(2) },
  { token: "tok-seed-B", city: "Kano", at: hoursAgo(2) },
];

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function seedUsers(): Promise<void> {
  for (const u of USERS) {
    try {
      await auth.createUser({ uid: u.uid, email: u.email, password: DEMO_PASSWORD, displayName: u.name });
      console.log(`  user created: ${u.email}`);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/uid-already-exists" || code === "auth/email-already-exists") {
        await auth.updateUser(u.uid, { email: u.email, password: DEMO_PASSWORD, displayName: u.name });
        console.log(`  user updated (already existed): ${u.email}`);
      } else {
        throw err;
      }
    }
  }
  console.log(`Seeded ${USERS.length} auth users (password for all: ${DEMO_PASSWORD})`);
}

async function seedRoles(): Promise<void> {
  await db.collection("roles").doc("usr_admin_demo_001").set({ role: "admin" });
  console.log("Seeded 1 admin role");
}

async function seedCompanies(): Promise<void> {
  for (const c of COMPANIES) {
    await db.collection("companies").doc(c.id).set({ ...c, createdAt: now, updatedAt: now });
  }
  console.log(`Seeded ${COMPANIES.length} companies (approved/pending/needs_info/rejected)`);
}

async function seedWallet(): Promise<void> {
  const wRef = db.collection("companies").doc(APPROVED_ID).collection("wallet").doc("summary");
  await wRef.set({
    creditBalance: 272500,
    lifetimeTopup: 300000,
    lifetimeSpent: 27500,
    currency: "NGN",
    updatedAt: now,
  });
  const invCol = db.collection("companies").doc(APPROVED_ID).collection("invoices");
  await invCol.doc("inv_seed_topup").set({
    kind: "topup",
    reference: "TOPUP-SEED-001",
    amount: 300000,
    codesApplied: 0,
    currency: "NGN",
    status: "paid",
    description: "Seed wallet top-up",
    createdAt: now,
  });
  await invCol.doc("inv_seed_batch1").set({
    kind: "purchase",
    reference: "NO-2608-001",
    amount: 25000,
    codesApplied: 500,
    currency: "NGN",
    status: "paid",
    description: "Batch NO-2608-001 — 500 codes for Nora Bright Toothpaste 100g",
    createdAt: now,
  });
  await invCol.doc("inv_seed_batch3").set({
    kind: "purchase",
    reference: "NO-2608-003",
    amount: 2500,
    codesApplied: 50,
    currency: "NGN",
    status: "paid",
    description: "Batch NO-2608-003 — 50 codes for Malomo Pure Cocoa Powder 500g",
    createdAt: now,
  });
  console.log("Seeded 1 wallet (balance 272,500 NGN) + 3 invoices for the approved company");
}

async function seedProducts(): Promise<void> {
  for (const p of PRODUCTS) {
    await db.collection("products").doc(p.id).set({
      companyId: APPROVED_ID,
      name: p.name,
      sku: p.sku,
      category: p.category,
      description: p.description,
      imageUrls: p.imageUrls,
      lotNumber: p.lotNumber ?? null,
      mfgDate: p.mfgDate ?? null,
      expiryDate: p.expiryDate ?? null,
      coaDocName: p.coaDocName ?? null,
      coaDocUrl: null,
      regulatoryNumber: p.regulatoryNumber ?? null,
      regulatoryDocName: null,
      regulatoryDocUrl: null,
      certificateOfAnalysisName: null,
      certificateOfAnalysisUrl: null,
      createdAt: now,
    });
  }
  console.log(`Seeded ${PRODUCTS.length} products`);
}

async function seedBatches(): Promise<void> {
  for (const b of BATCHES) {
    await db.collection("batches").doc(b.id).set({
      companyId: APPROVED_ID,
      productId: b.productId,
      productName: b.productName,
      batchNumber: b.batchNumber,
      quantity: b.quantity,
      amountCharged: b.amountCharged,
      currency: b.currency,
      freeCodesApplied: b.freeCodesApplied,
      status: b.status,
      generationProgress: 1,
      lotNumber: b.lotNumber,
      mfgDate: b.mfgDate,
      expiryDate: b.expiryDate,
      coaDocName: null,
      coaDocUrl: null,
      exportedAt: b.status === "exported" ? daysAgo(1) : null,
      createdAt: now,
    });
  }
  console.log(`Seeded ${BATCHES.length} batches`);
}

const batchCodeIds: Record<string, string[]> = {};

async function seedCodes(): Promise<void> {
  let total = 0;
  for (const b of BATCHES) {
    const strings = generateUniqueCodeStrings(b.quantity);
    const ids: string[] = [];
    for (let i = 0; i < strings.length; i += CHUNK) {
      const wb = db.batch();
      for (const s of strings.slice(i, i + CHUNK)) {
        const ref = db.collection("codes").doc();
        ids.push(ref.id);
        wb.set(ref, {
          batchId: b.id,
          productId: b.productId,
          companyId: APPROVED_ID,
          codeString: s,
          codeLookup: s.replace(/[^A-Z0-9]/gi, "").toUpperCase(),
          scanCount: 0,
          flagged: false,
          reviewStatus: "none",
          printCount: b.status === "exported" ? 1 : 0,
          exportedAt: b.status === "exported" ? daysAgo(1) : null,
          lastScannedAt: null,
          createdAt: now,
        });
      }
      await wb.commit();
    }
    batchCodeIds[b.id] = ids;
    total += strings.length;
  }
  console.log(`Seeded ${total} codes across ${BATCHES.length} batches (chunked writeBatch)`);
}

async function seedScans(): Promise<{ codeId: string; codeString: string }> {
  const firstBatchIds = batchCodeIds["bat_seed_001"];
  if (!firstBatchIds || !firstBatchIds[0]) throw new Error("seedCodes must run before seedScans");
  const codeId = firstBatchIds[0]!;
  const codeSnap = await db.collection("codes").doc(codeId).get();
  const codeString = String(codeSnap.data()?.codeString);

  for (const [i, s] of FRAUD_SCANS.entries()) {
    await db.collection("codes").doc(codeId).collection("scans").doc(`scn_seed_${i + 1}`).set({
      codeId,
      codeString,
      companyId: APPROVED_ID,
      productId: "prd_seed_toothpaste",
      batchId: "bat_seed_001",
      browserToken: s.token,
      city: s.city,
      country: "Nigeria",
      deviceFingerprint: "seed-emulator",
      flagged: false,
      scannedAt: s.at,
    });
  }
  // NOTE (honest accounting): the seeded flag below represents post-detection
  // state — verifyCode only ever sets flagged/reviewStatus when a NEW scan
  // arrives. The scan history above is deliberately shaped so the NEXT live
  // verification re-trips the thresholds (3 distinct tokens, 4 distinct
  // cities, scanCount 5 → genuine_repeated + flagged). If a live verify does
  // NOT flag this code, that is a bug in verifyCode, not in this seed data.
  await db.collection("codes").doc(codeId).update({
    scanCount: FRAUD_SCANS.length,
    flagged: true,
    reviewStatus: "open",
    lastScannedAt: hoursAgo(2),
  });
  console.log(`Seeded ${FRAUD_SCANS.length} scans on code ${codeString} (flagged, review open)`);
  return { codeId, codeString };
}

async function seedReports(flagged: { codeId: string; codeString: string }): Promise<void> {
  await db.collection("reports").doc("rep_seed_001").set({
    codeId: flagged.codeId,
    companyId: APPROVED_ID,
    codeString: flagged.codeString,
    contact: "consumer.concern@example.ng",
    message:
      "I think this toothpaste is counterfeit. The packaging looks different from the one I usually buy and the mint flavor seems weaker.",
    reviewed: false,
    createdAt: now,
  });
  console.log("Seeded 1 consumer report referencing the flagged code");
}

// ---------------------------------------------------------------------------
// Verify (re-reads everything, asserts the emulator checklist)
// ---------------------------------------------------------------------------

async function verifySeed(): Promise<void> {
  const checks: [string, boolean][] = [];

  const compSnaps = await db.collection("companies").get();
  const byId = new Map(compSnaps.docs.map((d) => [d.id, d.data()]));
  checks.push(["4 companies exist", compSnaps.size === 4]);
  checks.push(["approved status present", byId.get("usr_company_demo_001")?.status === "approved"]);
  checks.push(["pending status present", byId.get("usr_pending_003")?.status === "pending"]);
  checks.push(["needs_info status present", byId.get("usr_needsinfo_004")?.status === "needs_info"]);
  checks.push(["rejected status present", byId.get("usr_rejected_005")?.status === "rejected"]);
  checks.push([
    "every company has explicit countryCode",
    [...byId.values()].every((c) => typeof c.countryCode === "string" && c.countryCode.length === 2),
  ]);

  const wallet = await db.collection("companies").doc(APPROVED_ID).collection("wallet").doc("summary").get();
  checks.push(["wallet exists with non-zero balance", wallet.exists && Number(wallet.data()?.creditBalance) > 0]);

  const codesSnap = await db.collection("codes").get();
  const codes = codesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  checks.push(["570 codes exist", codes.length === 570]);
  checks.push([
    "codes link correct companyId/batchId",
    codes.every(
      (c: Record<string, unknown>) =>
        c.companyId === APPROVED_ID && ["bat_seed_001", "bat_seed_002", "bat_seed_003"].includes(c.batchId as string),
    ),
  ]);

  const flagged = codes.find((c: Record<string, unknown>) => c.flagged === true);
  checks.push(["one flagged code exists", !!flagged]);
  let scanCount = 0;
  if (flagged) {
    const scansSnap = await db.collection("codes").doc(flagged.id as string).collection("scans").get();
    scanCount = scansSnap.size;
    const cities = new Set(scansSnap.docs.map((d) => d.data().city));
    checks.push(["flagged code has 5 scans", scanCount === 5]);
    checks.push(["flagged code scans span 4 cities", cities.size === 4]);
    checks.push(["flagged code reviewStatus is open", flagged.reviewStatus === "open"]);
  }

  const repSnap = await db.collection("reports").doc("rep_seed_001").get();
  checks.push(["report exists", repSnap.exists]);
  checks.push([
    "report references flagged code id",
    repSnap.exists && repSnap.data()?.codeId === (flagged?.id as string) && !!flagged,
  ]);

  const roleSnap = await db.collection("roles").doc("usr_admin_demo_001").get();
  checks.push(["admin role exists", roleSnap.exists && roleSnap.data()?.role === "admin"]);

  let pass = 0;
  for (const [label, ok] of checks) {
    console.log(`  ${ok ? "PASS" : "FAIL"} — ${label}`);
    if (ok) pass++;
  }
  console.log(`Verification: ${pass}/${checks.length} checks passed`);
  if (pass !== checks.length) {
    throw new Error("Seed verification failed — see FAIL lines above.");
  }
}

// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  await seedUsers();
  await seedRoles();
  await seedCompanies();
  await seedWallet();
  await seedProducts();
  await seedBatches();
  await seedCodes();
  const flagged = await seedScans();
  await seedReports(flagged);
  console.log("--- verifying ---");
  await verifySeed();
  console.log("Seed complete.");
}

main().catch((err) => {
  console.error("SEED FAILED:", err);
  process.exit(1);
});
