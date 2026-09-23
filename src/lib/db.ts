/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  collection,
  collectionGroup,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { requireDb, requireFunctions, requireStorage } from "./firebase";

// ---------------------------------------------------------------------------
// Serialization: Firestore Timestamps -> ISO strings (one level deep)
// ---------------------------------------------------------------------------

function ser<T>(id: string, data: DocumentData): T {
  const out: Record<string, any> = { id };
  for (const [k, v] of Object.entries(data)) {
    out[k] = v instanceof Timestamp ? v.toDate().toISOString() : v;
  }
  return out as T;
}

// ---------------------------------------------------------------------------
// Types (camelCase Firestore schema)
// ---------------------------------------------------------------------------

export type CompanyStatus = "pending" | "approved" | "needs_info" | "rejected";

export interface Company {
  id: string;
  ownerId: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  registrationNumber: string;
  countryCode: string;
  status: CompanyStatus;
  logoUrl: string | null;
  documentUrl: string | null;
  adminNote: string | null;
  aiConfidence: number | null;
  aiFlags: { type: string; detail: string }[];
  freeCodesUsed: number;
  totalCodesGenerated: number;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  imageUrls: string[];
  lotNumber: string | null;
  mfgDate: string | null;
  expiryDate: string | null;
  coaDocName: string | null;
  coaDocUrl: string | null;
  regulatoryNumber: string | null;
  regulatoryDocName: string | null;
  regulatoryDocUrl: string | null;
  certificateOfAnalysisName: string | null;
  certificateOfAnalysisUrl: string | null;
  createdAt: string;
}

export interface Batch {
  id: string;
  companyId: string;
  productId: string;
  productName: string;
  batchNumber: string;
  quantity: number;
  amountCharged: number;
  currency: string;
  freeCodesApplied: number;
  status: "generating" | "ready" | "exported" | "failed";
  generationProgress: number;
  exportStatus?: { state: string; progress: number; codes?: number } | null;
  lotNumber: string | null;
  mfgDate: string | null;
  expiryDate: string | null;
  coaDocName: string | null;
  coaDocUrl: string | null;
  exportedAt: string | null;
  createdAt: string;
}

export interface Code {
  id: string;
  batchId: string;
  productId: string;
  companyId: string;
  codeString: string;
  scanCount: number;
  flagged: boolean;
  reviewStatus: "none" | "open" | "reviewed" | "escalated";
  printCount: number;
  exportedAt: string | null;
  lastScannedAt: string | null;
  createdAt: string;
}

export interface Scan {
  id: string;
  codeId: string;
  codeString: string;
  companyId: string;
  productId: string;
  batchId: string | null;
  browserToken: string | null;
  city: string | null;
  country: string | null;
  deviceFingerprint: string | null;
  flagged: boolean;
  scannedAt: string;
}

export interface Wallet {
  creditBalance: number;
  lifetimeTopup: number;
  lifetimeSpent: number;
  currency: string;
}

export interface Invoice {
  id: string;
  kind: "purchase" | "topup";
  reference: string;
  amount: number;
  codesApplied: number;
  currency: string;
  status: string;
  description: string;
  createdAt: string;
}

export interface Report {
  id: string;
  codeId: string | null;
  companyId: string | null;
  codeString: string;
  contact: string | null;
  message: string;
  reviewed: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Companies
// ---------------------------------------------------------------------------

export async function getCompany(uid: string): Promise<Company | null> {
  const snap = await getDoc(doc(requireDb(), "companies", uid));
  return snap.exists() ? ser<Company>(snap.id, snap.data()) : null;
}

export interface CompanyRegistration {
  name: string;
  email: string;
  phone: string;
  address: string;
  category: string;
  registrationNumber: string;
  countryCode: string;
  logoUrl?: string | null;
  documentUrl?: string | null;
}

export async function createCompany(uid: string, data: CompanyRegistration): Promise<void> {
  if (!data.countryCode) throw new Error("Operating country is required.");
  if (!data.registrationNumber.trim()) throw new Error("Business registration number is required.");
  await setDoc(doc(requireDb(), "companies", uid), {
    ownerId: uid,
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
    phone: data.phone.trim(),
    address: data.address.trim(),
    category: data.category,
    registrationNumber: data.registrationNumber.trim().toUpperCase(),
    countryCode: data.countryCode.toUpperCase(),
    status: "pending",
    logoUrl: data.logoUrl ?? null,
    documentUrl: data.documentUrl ?? null,
    adminNote: null,
    aiConfidence: null,
    aiFlags: [],
    freeCodesUsed: 0,
    totalCodesGenerated: 0,
    approvedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateCompanySelfService(
  uid: string,
  data: Partial<Pick<Company, "name" | "email" | "phone" | "address" | "category" | "registrationNumber" | "logoUrl" | "documentUrl">>,
): Promise<void> {
  await updateDoc(doc(requireDb(), "companies", uid), { ...data, updatedAt: serverTimestamp() });
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

function byCreatedDesc(a: { createdAt?: string }, b: { createdAt?: string }): number {
  return (b.createdAt || "").localeCompare(a.createdAt || "");
}

export async function listProducts(companyId: string): Promise<Product[]> {
  // NOTE: no orderBy — sorted client-side so no composite index is required.
  const snap = await getDocs(
    query(collection(requireDb(), "products"), where("companyId", "==", companyId)),
  );
  return snap.docs.map((d) => ser<Product>(d.id, d.data())).sort(byCreatedDesc);
}

export async function listProductOptions(companyId: string): Promise<Pick<Product, "id" | "name">[]> {
  const all = await listProducts(companyId);
  return all.map((p) => ({ id: p.id, name: p.name }));
}

export interface ProductInput {
  name: string;
  sku?: string;
  category: string;
  description?: string;
  imageUrls?: string[];
  lotNumber?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  coaDocName?: string | null;
  coaDocUrl?: string | null;
  regulatoryNumber?: string | null;
  regulatoryDocName?: string | null;
  regulatoryDocUrl?: string | null;
  certificateOfAnalysisName?: string | null;
  certificateOfAnalysisUrl?: string | null;
}

export async function createProduct(companyId: string, input: ProductInput): Promise<Product> {
  const ref = await addDoc(collection(requireDb(), "products"), {
    companyId,
    name: input.name.trim(),
    sku: input.sku?.trim() || "",
    category: input.category,
    description: input.description?.trim() || "",
    imageUrls: input.imageUrls ?? [],
    lotNumber: input.lotNumber ?? null,
    mfgDate: input.mfgDate ?? null,
    expiryDate: input.expiryDate ?? null,
    coaDocName: input.coaDocName ?? null,
    coaDocUrl: input.coaDocUrl ?? null,
    regulatoryNumber: input.regulatoryNumber ?? null,
    regulatoryDocName: input.regulatoryDocName ?? null,
    regulatoryDocUrl: input.regulatoryDocUrl ?? null,
    certificateOfAnalysisName: input.certificateOfAnalysisName ?? null,
    certificateOfAnalysisUrl: input.certificateOfAnalysisUrl ?? null,
    createdAt: serverTimestamp(),
  });
  const snap = await getDoc(ref);
  return ser<Product>(snap.id, snap.data()!);
}

export async function updateProduct(productId: string, input: Partial<ProductInput>): Promise<void> {
  await updateDoc(doc(requireDb(), "products", productId), { ...input });
}

export async function deleteProduct(productId: string): Promise<void> {
  await deleteDoc(doc(requireDb(), "products", productId));
}

// ---------------------------------------------------------------------------
// Batches & codes
// ---------------------------------------------------------------------------

export async function listBatches(companyId: string, n = 100): Promise<Batch[]> {
  // NOTE: no orderBy — sorted + sliced client-side so no composite index is required.
  const snap = await getDocs(
    query(collection(requireDb(), "batches"), where("companyId", "==", companyId)),
  );
  return snap.docs
    .map((d) => ser<Batch>(d.id, d.data()))
    .sort(byCreatedDesc)
    .slice(0, n);
}

export async function getBatch(batchId: string): Promise<Batch | null> {
  const snap = await getDoc(doc(requireDb(), "batches", batchId));
  return snap.exists() ? ser<Batch>(snap.id, snap.data()) : null;
}

export interface CodeFilters {
  productId?: string | undefined;
  batchId?: string | undefined;
  flaggedOnly?: boolean | undefined;
  limitN?: number | undefined;
}

export async function listCodes(companyId: string, filters: CodeFilters = {}): Promise<Code[]> {
  // NOTE: equality filters only, no orderBy — sorted + sliced client-side so
  // no composite index is required.
  const clauses: any[] = [where("companyId", "==", companyId)];
  if (filters.productId) clauses.push(where("productId", "==", filters.productId));
  if (filters.batchId) clauses.push(where("batchId", "==", filters.batchId));
  if (filters.flaggedOnly) clauses.push(where("flagged", "==", true));
  const snap = await getDocs(
    query(collection(requireDb(), "codes"), ...clauses, limit(filters.limitN ?? 500)),
  );
  return snap.docs
    .map((d) => ser<Code>(d.id, d.data()))
    .sort(byCreatedDesc)
    .slice(0, filters.limitN ?? 500);
}

export async function listBatchCodeStrings(batchId: string): Promise<string[]> {
  // NOTE: no orderBy — paged by document-id order, sorted client-side, so no
  // composite index is required.
  const out: string[] = [];
  let cursor: DocumentData | undefined;
  for (;;) {
    const snap = await getDocs(
      query(
        collection(requireDb(), "codes"),
        where("batchId", "==", batchId),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(1000),
      ),
    );
    if (snap.empty) break;
    for (const d of snap.docs) out.push(String(d.data()["codeString"]));
    if (snap.size < 1000) break;
    cursor = snap.docs[snap.docs.length - 1];
  }
  return out.sort();
}

// ---------------------------------------------------------------------------
// Scans (collection-group analytics)
// ---------------------------------------------------------------------------

export async function listCompanyScans(companyId: string, sinceIso: string, maxN = 5000): Promise<Scan[]> {
  // NOTE: single equality filter only — time-filtered + sorted client-side so
  // no collection-group composite index is required.
  const since = new Date(sinceIso).toISOString();
  const snap = await getDocs(
    query(collectionGroup(requireDb(), "scans"), where("companyId", "==", companyId), limit(maxN)),
  );
  return snap.docs
    .map((d) => ser<Scan>(d.id, d.data()))
    .filter((s) => (s.scannedAt || "") >= since)
    .sort((a, b) => (b.scannedAt || "").localeCompare(a.scannedAt || ""));
}

// ---------------------------------------------------------------------------
// Wallet & invoices
// ---------------------------------------------------------------------------

export async function getWallet(companyId: string): Promise<Wallet | null> {
  const snap = await getDoc(doc(requireDb(), "companies", companyId, "wallet", "summary"));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    creditBalance: Number(d["creditBalance"] || 0),
    lifetimeTopup: Number(d["lifetimeTopup"] || 0),
    lifetimeSpent: Number(d["lifetimeSpent"] || 0),
    currency: String(d["currency"] || "USD"),
  };
}

export async function listInvoices(companyId: string, n = 100): Promise<Invoice[]> {
  const snap = await getDocs(
    query(
      collection(requireDb(), "companies", companyId, "invoices"),
      orderBy("createdAt", "desc"),
      limit(n),
    ),
  );
  return snap.docs.map((d) => ser<Invoice>(d.id, d.data()));
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export async function submitReport(input: {
  codeId?: string | null;
  companyId?: string | null;
  codeString: string;
  contact?: string | null;
  message: string;
}): Promise<void> {
  await addDoc(collection(requireDb(), "reports"), {
    codeId: input.codeId ?? null,
    companyId: input.companyId ?? null,
    codeString: input.codeString,
    contact: input.contact ?? null,
    message: input.message,
    reviewed: false,
    createdAt: serverTimestamp(),
  });
}

export async function listReports(n = 500): Promise<Report[]> {
  const snap = await getDocs(
    query(collection(requireDb(), "reports"), orderBy("createdAt", "desc"), limit(n)),
  );
  return snap.docs.map((d) => ser<Report>(d.id, d.data()));
}

// ---------------------------------------------------------------------------
// Admin reads
// ---------------------------------------------------------------------------

export async function listCompaniesByStatus(statuses: CompanyStatus[]): Promise<Company[]> {
  // NOTE: no orderBy — sorted client-side so no composite index is required.
  const snap = await getDocs(
    query(collection(requireDb(), "companies"), where("status", "in", statuses)),
  );
  return snap.docs.map((d) => ser<Company>(d.id, d.data())).sort(byCreatedDesc);
}

export async function listAllCompanies(): Promise<Company[]> {
  const snap = await getDocs(query(collection(requireDb(), "companies"), orderBy("createdAt", "desc"), limit(500)));
  return snap.docs.map((d) => ser<Company>(d.id, d.data()));
}

export async function countCollection(coll: "products" | "batches" | "codes", companyId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(collection(requireDb(), coll), where("companyId", "==", companyId)),
  );
  return snap.data().count;
}

export async function countCodesForProduct(companyId: string, productId: string): Promise<number> {
  const snap = await getCountFromServer(
    query(
      collection(requireDb(), "codes"),
      where("companyId", "==", companyId),
      where("productId", "==", productId),
    ),
  );
  return snap.data().count;
}

// ---------------------------------------------------------------------------
// Platform admin reads
// ---------------------------------------------------------------------------

export interface PlatformMetrics {
  pending: number;
  needsInfo: number;
  approved: number;
  rejected: number;
  totalCompanies: number;
  totalCodes: number;
  totalRevenue: number;
  revenueCurrency: string;
  scans30d: number;
}

export async function platformMetrics(): Promise<PlatformMetrics> {
  const companies = await listAllCompanies();
  const walletsSnap = await getDocs(collectionGroup(requireDb(), "summary"));
  let revenue = 0;
  let revenueCurrency = "USD";
  for (const d of walletsSnap.docs) {
    revenue += Number(d.data()["lifetimeSpent"] || 0);
    if (d.data()["currency"]) revenueCurrency = String(d.data()["currency"]);
  }
  const scansSnap = await getDocs(
    query(
      collectionGroup(requireDb(), "scans"),
      where("scannedAt", ">=", Timestamp.fromDate(new Date(Date.now() - 30 * 864e5))),
      limit(5000),
    ),
  );
  return {
    pending: companies.filter((c) => c.status === "pending").length,
    needsInfo: companies.filter((c) => c.status === "needs_info").length,
    approved: companies.filter((c) => c.status === "approved").length,
    rejected: companies.filter((c) => c.status === "rejected").length,
    totalCompanies: companies.length,
    totalCodes: companies.reduce((s, c) => s + (c.totalCodesGenerated || 0), 0),
    totalRevenue: revenue,
    revenueCurrency,
    scans30d: scansSnap.size,
  };
}

export interface CompanyOverview extends Company {
  productCount: number;
  codeCount: number;
}

export async function adminCompanyOverview(): Promise<CompanyOverview[]> {
  const companies = await listAllCompanies();
  return Promise.all(
    companies.map(async (c) => {
      const [productCount, codeCount] = await Promise.all([
        countCollection("products", c.id),
        countCollection("codes", c.id),
      ]);
      return { ...c, productCount, codeCount };
    }),
  );
}

export async function listFlaggedCodes(maxN = 100): Promise<Code[]> {
  const [flaggedSnap, openSnap] = await Promise.all([
    getDocs(query(collection(requireDb(), "codes"), where("flagged", "==", true), limit(maxN))),
    getDocs(
      query(collection(requireDb(), "codes"), where("reviewStatus", "==", "open"), limit(maxN)),
    ),
  ]);
  const merged = new Map<string, Code>();
  for (const d of [...flaggedSnap.docs, ...openSnap.docs]) {
    if (!merged.has(d.id)) merged.set(d.id, ser<Code>(d.id, d.data()));
  }
  return [...merged.values()]
    .sort((a, b) => (b.lastScannedAt || b.createdAt).localeCompare(a.lastScannedAt || a.createdAt))
    .slice(0, maxN);
}

export async function listCodeScans(codeId: string, maxN = 100): Promise<Scan[]> {
  const snap = await getDocs(
    query(
      collection(requireDb(), "codes", codeId, "scans"),
      orderBy("scannedAt", "desc"),
      limit(maxN),
    ),
  );
  return snap.docs.map((d) => ser<Scan>(d.id, d.data()));
}

export async function platformScans(sinceIso: string, maxN = 5000): Promise<Scan[]> {
  const snap = await getDocs(
    query(
      collectionGroup(requireDb(), "scans"),
      where("scannedAt", ">=", Timestamp.fromDate(new Date(sinceIso))),
      orderBy("scannedAt", "asc"),
      limit(maxN),
    ),
  );
  return snap.docs.map((d) => ser<Scan>(d.id, d.data()));
}

export async function nameMaps(ids: { companyIds: string[]; productIds: string[]; batchIds: string[] }): Promise<{
  companies: Map<string, string>;
  products: Map<string, string>;
  batches: Map<string, string>;
}> {
  const companies = new Map<string, string>();
  const products = new Map<string, string>();
  const batches = new Map<string, string>();
  await Promise.all([
    ...[...new Set(ids.companyIds)].map(async (id) => {
      const s = await getDoc(doc(requireDb(), "companies", id));
      if (s.exists()) companies.set(id, String(s.data()["name"] || "—"));
    }),
    ...[...new Set(ids.productIds)].map(async (id) => {
      const s = await getDoc(doc(requireDb(), "products", id));
      if (s.exists()) products.set(id, String(s.data()["name"] || "—"));
    }),
    ...[...new Set(ids.batchIds)].map(async (id) => {
      const s = await getDoc(doc(requireDb(), "batches", id));
      if (s.exists()) batches.set(id, String(s.data()["batchNumber"] || id));
    }),
  ]);
  return { companies, products, batches };
}

// ---------------------------------------------------------------------------
// Cloud Function callables (typed wrappers)
// ---------------------------------------------------------------------------

async function callFn<T>(name: string, data?: Record<string, any>): Promise<T> {
  const fn = httpsCallable(requireFunctions(), name);
  const res = await fn(data ?? {});
  return res.data as T;
}

export interface PriceQuoteResult {
  requiresQuote: boolean;
  currency: string;
  symbol: string;
  free: number;
  paid: number;
  price: number;
  breakdown: { label: string; qty: number; rate: number; subtotal: number }[];
}

export const fnCalculatePrice = (quantity: number) =>
  callFn<PriceQuoteResult>("calculateprice", { quantity });

export interface GenerateBatchResult {
  batchId: string;
  batchNumber: string;
  quantity: number;
  price: number;
  currency: string;
  free: number;
  status: string;
}

export const fnGenerateBatchPaid = (input: {
  productId: string;
  quantity: number;
  lotNumber?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
  coaDocName?: string | null;
  coaDocUrl?: string | null;
  resumeBatchId?: string;
}) => callFn<GenerateBatchResult>("generatebatchpaid", input);

export interface VerifyResult {
  status: "genuine" | "genuine_repeated" | "invalid";
  code?: string;
  scan_count?: number;
  product?: {
    name: string;
    category: string;
    description: string;
    image: string | null;
    images: string[];
    lotNumber: string | null;
    mfgDate: string | null;
    expiryDate: string | null;
    regulatoryNumber: string | null;
    regulatoryDocName: string | null;
    regulatoryDocUrl: string | null;
    certificateOfAnalysisName: string | null;
    certificateOfAnalysisUrl: string | null;
    coaDocName: string | null;
    coaDocUrl: string | null;
  };
  company?: { name: string; logo: string | null };
  batch?: { number: string; produced_at: string | null; lotNumber: string | null };
}

export const fnVerifyCode = (input: {
  code: string;
  browserToken?: string | null;
  city?: string | null;
  country?: string | null;
  deviceFingerprint?: string | null;
}) => callFn<VerifyResult>("verifycode", input);

export const fnAdminApproveCompany = (companyId: string, note?: string | null) =>
  callFn("adminapprovecompany", { companyId, note: note ?? null });
export const fnAdminRejectCompany = (companyId: string, note?: string | null) =>
  callFn("adminrejectcompany", { companyId, note: note ?? null });
export const fnAdminRequestInfo = (companyId: string, note?: string | null) =>
  callFn("adminrequestinfo", { companyId, note: note ?? null });
export const fnAdminReviewReport = (reportId: string, reviewed: boolean) =>
  callFn("adminreviewreport", { reportId, reviewed });
export const fnTopupWallet = (companyId: string, amount: number, reference?: string) =>
  callFn("topupwallet", { companyId, amount, reference });
export const fnMarkCodesExported = (batchId: string) => callFn("markcodesexported", { batchId });
export const fnSetCodeReview = (codeId: string, status: "reviewed" | "escalated") =>
  callFn("setcodereview", { codeId, status });

export interface ExportBatchResult {
  ok: boolean;
  batchId: string;
  totalCodes: number;
  pdfCodes: number;
  pdfCapped: boolean;
  codesUpdated: number;
  csvUrl: string;
  pdfUrl: string;
}

export const fnExportBatch = (batchId: string) => callFn<ExportBatchResult>("exportbatch", { batchId });

// ---------------------------------------------------------------------------
// Money formatting
// ---------------------------------------------------------------------------

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: "₦", USD: "$", GHS: "₵", KES: "KSh", ZAR: "R", EGP: "E£", RWF: "RF",
  UGX: "USh", TZS: "TSh", ETB: "Br", XOF: "CFA", XAF: "FCFA", MAD: "DH",
  CAD: "CA$", MXN: "MX$", GBP: "£", EUR: "€", CHF: "CHF", SEK: "kr",
  NOK: "kr", DKK: "kr", PLN: "zł", AED: "د.إ", SAR: "﷼", QAR: "QR",
  KWD: "KD", INR: "₹", CNY: "¥", JPY: "¥", SGD: "S$", AUD: "A$", NZD: "NZ$",
  KRW: "₩", MYR: "RM", IDR: "Rp", PHP: "₱", THB: "฿", VND: "₫", PKR: "₨",
  BDT: "৳", BRL: "R$", ARS: "AR$", CLP: "CL$", COP: "CO$", PEN: "S/",
  AOA: "Kz", BWP: "P", CDF: "FC", DZD: "DA", TND: "DT", ZMW: "K",
  MUR: "₨", NAD: "N$", TRY: "₺", ILS: "₪", HKD: "HK$", TWD: "NT$",
};

export function formatMoney(amount: number, currency = "USD"): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  return (
    symbol +
    amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );
}

// ---------------------------------------------------------------------------
// Storage uploads
// ---------------------------------------------------------------------------

export async function uploadProductImage(companyId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const key = `${companyId}/img-${Date.now()}.${ext}`;
  const storageRef = ref(requireStorage(), `product-images/${key}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function uploadCompanyDoc(companyId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "pdf";
  const key = `${companyId}/doc-${Date.now()}.${ext}`;
  const storageRef = ref(requireStorage(), `verification-docs/${key}`);
  await uploadBytes(storageRef, file);
  return `verification-docs/${key}`;
}

/** Resolve a private Storage path (e.g. verification-docs/...) to a fresh download URL. */
export async function storagePathUrl(path: string): Promise<string> {
  return getDownloadURL(ref(requireStorage(), path));
}

/** Resolve a stored document reference: http(s) URLs pass through, paths resolve. */
export async function resolveDocUrl(refValue: string | null): Promise<string | null> {
  if (!refValue) return null;
  if (/^https?:\/\//i.test(refValue)) return refValue;
  try {
    return await storagePathUrl(refValue);
  } catch {
    return null;
  }
}
