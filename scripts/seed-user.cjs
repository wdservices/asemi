// Seed a single real user account: company doc (+ wallet if approved) and one
// sample product. Run with env vars (firebase-admin resolves from
// functions/node_modules via NODE_PATH):
//
//   NODE_PATH=functions/node_modules GOOGLE_APPLICATION_CREDENTIALS=... \
//   SEED_UID=... SEED_EMAIL=... SEED_NAME=... SEED_COUNTRY=NG \
//   SEED_REGNO=... SEED_STATUS=approved node scripts/seed-user.cjs
//
// Against the emulator, set FIRESTORE_EMULATOR_HOST / FIREBASE_AUTH_EMULATOR_HOST
// instead of GOOGLE_APPLICATION_CREDENTIALS. Refuses to overwrite an existing
// company doc — delete it first if you really want a clean re-seed.
const admin = require("firebase-admin");

const {
  SEED_UID: uid,
  SEED_EMAIL: email,
  SEED_NAME: name,
  SEED_COUNTRY: countryCode,
  SEED_REGNO: regNo,
  SEED_STATUS: status = "approved",
} = process.env;

if (!uid || !email || !name || !countryCode || !regNo) {
  console.error("Missing one of SEED_UID/SEED_EMAIL/SEED_NAME/SEED_COUNTRY/SEED_REGNO");
  process.exit(1);
}

if (process.env.FIRESTORE_EMULATOR_HOST) {
  admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "asemi-c14ac" });
  console.log("Target: EMULATOR");
} else {
  admin.initializeApp();
  console.log("Target: REAL PROJECT (service account)");
}

const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

(async () => {
  await admin
    .auth()
    .getUser(uid)
    .catch(() => {
      throw new Error(`No Auth user ${uid} (${email}) — register it first.`);
    });

  const cRef = db.collection("companies").doc(uid);
  if ((await cRef.get()).exists) {
    throw new Error(`companies/${uid} already exists — refusing to overwrite.`);
  }

  await cRef.set({
    ownerId: uid,
    name,
    email: email.toLowerCase(),
    phone: "",
    address: "",
    category: "Other",
    registrationNumber: regNo.toUpperCase(),
    countryCode: countryCode.toUpperCase(),
    status,
    logoUrl: null,
    documentUrl: null,
    adminNote: null,
    aiConfidence: null,
    aiFlags: [],
    freeCodesUsed: 0,
    totalCodesGenerated: 0,
    approvedAt: status === "approved" ? now : null,
    createdAt: now,
    updatedAt: now,
  });
  console.log(`companies/${uid} created (status: ${status})`);

  if (status === "approved") {
    const currency = countryCode.toUpperCase() === "NG" ? "NGN" : "USD";
    await cRef.collection("wallet").doc("summary").set({
      creditBalance: 0,
      lifetimeTopup: 0,
      lifetimeSpent: 0,
      currency,
      updatedAt: now,
    });
    console.log(`wallet/summary created (${currency}, zero balance — 20 free codes available)`);
  }

  const pRef = await db.collection("products").add({
    companyId: uid,
    name: "Sample Product 250ml",
    sku: "SAMPLE-001",
    category: "Other",
    description: "Sample product created during account seeding — edit or delete it anytime.",
    imageUrls: [],
    lotNumber: null,
    mfgDate: null,
    expiryDate: null,
    coaDocName: null,
    coaDocUrl: null,
    regulatoryNumber: null,
    regulatoryDocName: null,
    regulatoryDocUrl: null,
    certificateOfAnalysisName: null,
    certificateOfAnalysisUrl: null,
    createdAt: now,
  });
  console.log(`products/${pRef.id} sample product created`);

  // Verify
  const check = await cRef.get();
  console.log(
    `VERIFY company: ${check.exists && check.data().status === status ? "PASS" : "FAIL"}`,
  );
  console.log("Done.");
  process.exit(0);
})().catch((err) => {
  console.error("SEED-USER FAILED:", err.message || err);
  process.exit(1);
});
