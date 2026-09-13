import QRCode from "qrcode";

export const COUNTRIES: [string, string][] = [
  ["Nigeria", "NG"],
  ["United States", "US"],
  ["United Kingdom", "GB"],
  ["Germany", "DE"],
  ["France", "FR"],
  ["Canada", "CA"],
  ["Ghana", "GH"],
  ["Kenya", "KE"],
  ["South Africa", "ZA"],
  ["India", "IN"],
  ["China", "CN"],
  ["Japan", "JP"],
  ["Brazil", "BR"],
  ["Australia", "AU"],
  ["Italy", "IT"],
  ["Spain", "ES"],
  ["Netherlands", "NL"],
  ["Switzerland", "CH"],
  ["United Arab Emirates", "AE"],
  ["Saudi Arabia", "SA"],
  ["Egypt", "EG"],
  ["Rwanda", "RW"],
  ["Uganda", "UG"],
  ["Tanzania", "TZ"],
  ["Ethiopia", "ET"],
  ["Senegal", "SN"],
  ["Ivory Coast", "CI"],
  ["Cameroon", "CM"],
  ["Singapore", "SG"],
  ["Malaysia", "MY"],
  ["Indonesia", "ID"],
  ["Mexico", "MX"],
  ["Argentina", "AR"],
  ["Chile", "CL"],
  ["Colombia", "CO"],
  ["Sweden", "SE"],
  ["Norway", "NO"],
  ["Denmark", "DK"],
  ["Finland", "FI"],
  ["Poland", "PL"],
  ["Ireland", "IE"],
  ["Portugal", "PT"],
  ["Belgium", "BE"],
  ["Austria", "AT"],
  ["New Zealand", "NZ"],
  ["Turkey", "TR"],
  ["Vietnam", "VN"],
  ["Thailand", "TH"],
  ["Philippines", "PH"],
  ["Pakistan", "PK"],
  ["Bangladesh", "BD"],
];

export type CompanyStatus = "PENDING" | "APPROVED" | "REJECTED" | "NEEDS_INFO";
export type UserRole = "COMPANY_USER" | "ADMIN";

export interface AIFlag {
  type: "success" | "warning" | "info" | "error";
  label: string;
  detail: string;
}

export interface Company {
  id: string;
  name: string;
  email: string;
  phone: string;
  countryCode: string; // ISO 3166-1 alpha-2, e.g. "NG", "US" — LOCKS pricing region
  registrationNumber: string; // CAC number or local equivalent
  status: CompanyStatus;
  verificationDocUrl?: string;
  aiReviewScore?: number; // 0 - 100 confidence score
  aiReviewFlags?: AIFlag[];
  adminNote?: string;
  totalCodesGenerated: number;
  freeCodesUsed: number;
  createdAt: string;
  approvedAt?: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  companyId?: string;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  createdAt: string;
}

export interface Batch {
  id: string;
  companyId: string;
  productId: string;
  productName: string;
  quantity: number;
  amountCharged: number;
  currency: string;
  createdAt: string;
}

export interface Code {
  id: string;
  batchId: string;
  productId: string;
  companyId: string;
  codeString: string; // random alphanumeric, not sequential
  qrUrl: string;
  printCount: number;
  exportedAt?: string;
  createdAt: string;
}

export interface Scan {
  id: string;
  codeId: string;
  codeString: string;
  productId: string;
  companyId: string;
  timestamp: string;
  browserToken: string;
  roughLocation: string;
  deviceFingerprint: string;
  flagged: boolean;
}

export interface Report {
  id: string;
  codeId: string;
  codeString: string;
  companyId: string;
  productName: string;
  message: string;
  contact?: string;
  reviewed: boolean;
  createdAt: string;
}

export interface Transaction {
  id: string;
  companyId: string;
  batchId?: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "failed";
  provider: "stripe" | "paystack" | "flutterwave";
  reference: string;
  createdAt: string;
}

// -------------------------------------------------------------
// 4a. Region-locked Pricing
// -------------------------------------------------------------

export const PRICING_REGIONS: Record<
  string,
  { currency: string; symbol: string; tiers: number[] }
> = {
  NG: { currency: "NGN", symbol: "₦", tiers: [50, 40, 30, 20, 12] },
  DEFAULT: { currency: "USD", symbol: "$", tiers: [0.15, 0.12, 0.1, 0.07, 0.05] },
};

export const TIER_CAPS = [5000, 20000, 100000, 500000, 1000000];
export const CONTACT_SALES_THRESHOLD = 1_000_000;
export const FREE_CODES = 20;

export function regionFor(countryCode: string) {
  return PRICING_REGIONS[countryCode] ?? PRICING_REGIONS.DEFAULT;
}

export interface PriceBreakdownItem {
  qty: number;
  rate: number;
  subtotal: number;
}

export interface CalculationResult {
  price: number;
  free: number;
  breakdown: PriceBreakdownItem[];
  currency: string;
  symbol: string;
  requiresQuote: boolean;
}

export function calculatePrice(
  qty: number,
  company: Pick<Company, "countryCode" | "totalCodesGenerated" | "freeCodesUsed">,
): CalculationResult {
  const region = regionFor(company.countryCode);
  let remaining = qty;
  const free = Math.min(remaining, Math.max(0, FREE_CODES - company.freeCodesUsed));
  remaining -= free;

  const paidSoFar = company.totalCodesGenerated - company.freeCodesUsed;
  if (paidSoFar + remaining > CONTACT_SALES_THRESHOLD) {
    return {
      price: 0,
      free,
      breakdown: [],
      currency: region.currency,
      symbol: region.symbol,
      requiresQuote: true,
    };
  }

  let price = 0;
  let pos = paidSoFar;
  const breakdown: PriceBreakdownItem[] = [];
  for (let i = 0; i < TIER_CAPS.length && remaining > 0; i++) {
    const cap = TIER_CAPS[i] - pos;
    if (cap <= 0) continue;
    const inBracket = Math.min(remaining, cap);
    const rate = region.tiers[i];
    const subtotal = inBracket * rate;
    price += subtotal;
    breakdown.push({ qty: inBracket, rate, subtotal });
    remaining -= inBracket;
    pos += inBracket;
  }

  return {
    price,
    free,
    breakdown,
    currency: region.currency,
    symbol: region.symbol,
    requiresQuote: false,
  };
}

// -------------------------------------------------------------
// Helper: Checksum Code Generator
// Random alphanumeric, not sequential (10 chars + 2 checksum chars)
// e.g. ASM-9K4T-7X2P
// -------------------------------------------------------------
const CHARSET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // No ambiguous chars (0, O, 1, I)

export function generateCodeString(): string {
  let raw = "";
  for (let i = 0; i < 8; i++) {
    raw += CHARSET.charAt(Math.floor(Math.random() * CHARSET.length));
  }
  // Compute simple mod checksum
  let sum = 0;
  for (let i = 0; i < raw.length; i++) {
    sum = (sum * 31 + CHARSET.indexOf(raw[i])) % CHARSET.length;
  }
  const check1 = CHARSET[sum % CHARSET.length];
  const check2 = CHARSET[(sum * 7 + 13) % CHARSET.length];

  const part1 = raw.slice(0, 4);
  const part2 = raw.slice(4, 8) + check1 + check2;
  return `ASM-${part1}-${part2}`;
}

export async function generateQrDataUrl(codeString: string): Promise<string> {
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : "https://asemi.app"}/v/${encodeURIComponent(codeString)}`;
  try {
    return await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: "H",
      margin: 1,
      width: 280,
      color: {
        dark: "#0c0b09",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("QR generation error:", err);
    return "";
  }
}

// -------------------------------------------------------------
// Seed Data
// -------------------------------------------------------------

const INITIAL_COMPANIES: Company[] = [
  {
    id: "comp_dove",
    name: "Dove Care Products Ltd",
    email: "compliance@dovecare.ng",
    phone: "+234 803 123 4567",
    countryCode: "NG",
    registrationNumber: "RC-1492048",
    status: "APPROVED",
    verificationDocUrl:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
    aiReviewScore: 98,
    aiReviewFlags: [
      {
        type: "success",
        label: "CAC Registration Verified",
        detail: "RC-1492048 matches Corporate Affairs Commission registry.",
      },
      {
        type: "success",
        label: "Legal Entity Match",
        detail: "Registered company name exactly matches tax clearance certificate.",
      },
      {
        type: "info",
        label: "Region Locked",
        detail: "Country strictly locked to Nigeria (NGN pricing table).",
      },
    ],
    adminNote: "Verified via CAC portal. Active manufacturer license.",
    totalCodesGenerated: 12500,
    freeCodesUsed: 20,
    createdAt: "2026-06-10T10:00:00Z",
    approvedAt: "2026-06-11T14:30:00Z",
  },
  {
    id: "comp_apex",
    name: "Apex Nutra Labs",
    email: "operations@apexnutra.com",
    phone: "+1 415 890 2341",
    countryCode: "US",
    registrationNumber: "DE-LLC-892104",
    status: "APPROVED",
    verificationDocUrl:
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80",
    aiReviewScore: 94,
    aiReviewFlags: [
      {
        type: "success",
        label: "Delaware Division of Corp",
        detail: "Active Certificate of Good Standing verified.",
      },
      {
        type: "success",
        label: "FDA Facility Registry",
        detail: "Dietary supplement establishment registration active.",
      },
      {
        type: "info",
        label: "Region Locked",
        detail: "Country locked to United States (USD pricing table).",
      },
    ],
    adminNote: "Reviewed by Compliance Team. Verified Delaware certificate.",
    totalCodesGenerated: 6000,
    freeCodesUsed: 20,
    createdAt: "2026-07-02T11:00:00Z",
    approvedAt: "2026-07-03T09:15:00Z",
  },
  {
    id: "comp_sahara",
    name: "Sahara Agri Tech",
    email: "founder@sahara-agri.ng",
    phone: "+234 812 555 0199",
    countryCode: "NG",
    registrationNumber: "BN-2849102",
    status: "PENDING",
    verificationDocUrl:
      "https://images.unsplash.com/photo-1618042164219-62c820f10723?auto=format&fit=crop&w=600&q=80",
    aiReviewScore: 91,
    aiReviewFlags: [
      {
        type: "success",
        label: "Business Name Matched",
        detail: "CAC Certificate text matches 'Sahara Agri Tech'.",
      },
      {
        type: "success",
        label: "BN Number Verified",
        detail: "Registered business name format confirmed valid.",
      },
      {
        type: "warning",
        label: "Registration Date Check",
        detail: "Incorporated within last 90 days. Human verification recommended.",
      },
    ],
    adminNote: undefined,
    totalCodesGenerated: 0,
    freeCodesUsed: 0,
    createdAt: "2026-09-12T16:20:00Z",
  },
  {
    id: "comp_lumina",
    name: "Lumina BioSciences",
    email: "security@luminabio.eu",
    phone: "+49 30 901820",
    countryCode: "DE",
    registrationNumber: "HRB-94812B",
    status: "APPROVED",
    verificationDocUrl:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
    aiReviewScore: 97,
    aiReviewFlags: [
      {
        type: "success",
        label: "Handelsregister Verified",
        detail: "Amtsgericht Berlin-Charlottenburg entry confirmed.",
      },
      {
        type: "info",
        label: "Region Locked",
        detail: "Default international tier (USD pricing table).",
      },
    ],
    adminNote: "Approved for medical equipment packaging.",
    totalCodesGenerated: 1200,
    freeCodesUsed: 20,
    createdAt: "2026-08-14T08:00:00Z",
    approvedAt: "2026-08-15T11:00:00Z",
  },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod_dove_shea",
    companyId: "comp_dove",
    name: "Pure Shea Butter 250ml",
    category: "Personal Care",
    description: "Cold-pressed organic unrefined Shea butter infused with vitamin E.",
    images: [
      "https://images.unsplash.com/photo-1608248597359-e9392e2195f1?auto=format&fit=crop&w=600&q=80",
    ],
    createdAt: "2026-06-12T10:00:00Z",
  },
  {
    id: "prod_dove_soap",
    companyId: "comp_dove",
    name: "African Black Herbal Soap Bar",
    category: "Personal Care",
    description: "Authentic handmade black soap with roasted cocoa pods and plantain skin ash.",
    images: [
      "https://images.unsplash.com/photo-1607006314644-8d48a1d7f1d4?auto=format&fit=crop&w=600&q=80",
    ],
    createdAt: "2026-06-15T12:00:00Z",
  },
  {
    id: "prod_apex_omega",
    companyId: "comp_apex",
    name: "Ultra Omega-3 Wild Alaskan Fish Oil",
    category: "Nutraceuticals",
    description: "Triple strength molecularly distilled EPA/DHA softgels (120 count).",
    images: [
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=600&q=80",
    ],
    createdAt: "2026-07-05T09:00:00Z",
  },
  {
    id: "prod_sahara_seeds",
    companyId: "comp_sahara",
    name: "Hybrid Sorghum Seed Batch 5kg",
    category: "Agriculture",
    description: "Drought-tolerant certified disease-free high-yield sorghum planting seeds.",
    images: [],
    createdAt: "2026-09-12T17:00:00Z",
  },
];

const INITIAL_BATCHES: Batch[] = [
  {
    id: "batch_101",
    companyId: "comp_dove",
    productId: "prod_dove_shea",
    productName: "Pure Shea Butter 250ml",
    quantity: 5000,
    amountCharged: 249000, // (5000 - 20) * 50
    currency: "NGN",
    createdAt: "2026-06-16T14:00:00Z",
  },
  {
    id: "batch_102",
    companyId: "comp_dove",
    productId: "prod_dove_soap",
    productName: "African Black Herbal Soap Bar",
    quantity: 7500,
    amountCharged: 300000,
    currency: "NGN",
    createdAt: "2026-08-01T11:30:00Z",
  },
  {
    id: "batch_103",
    companyId: "comp_apex",
    productId: "prod_apex_omega",
    productName: "Ultra Omega-3 Wild Alaskan Fish Oil",
    quantity: 6000,
    amountCharged: 870, // USD
    currency: "USD",
    createdAt: "2026-07-10T16:00:00Z",
  },
];

const INITIAL_CODES: Code[] = [
  {
    id: "code_shea_01",
    batchId: "batch_101",
    productId: "prod_dove_shea",
    companyId: "comp_dove",
    codeString: "ASM-9K4T-7X2P",
    qrUrl: "",
    printCount: 1,
    exportedAt: "2026-06-16T15:00:00Z",
    createdAt: "2026-06-16T14:05:00Z",
  },
  {
    id: "code_soap_flagged",
    batchId: "batch_102",
    productId: "prod_dove_soap",
    companyId: "comp_dove",
    codeString: "ASM-3B8R-9Q1Z",
    qrUrl: "",
    printCount: 3,
    exportedAt: "2026-08-01T12:00:00Z",
    createdAt: "2026-08-01T11:35:00Z",
  },
  {
    id: "code_apex_01",
    batchId: "batch_103",
    productId: "prod_apex_omega",
    companyId: "comp_apex",
    codeString: "ASM-7N2W-4M8K",
    qrUrl: "",
    printCount: 2,
    exportedAt: "2026-07-10T17:00:00Z",
    createdAt: "2026-07-10T16:05:00Z",
  },
];

const INITIAL_SCANS: Scan[] = [
  {
    id: "scan_1",
    codeId: "code_shea_01",
    codeString: "ASM-9K4T-7X2P",
    productId: "prod_dove_shea",
    companyId: "comp_dove",
    timestamp: "2026-09-08T14:22:10Z",
    browserToken: "tok_consumer_alpha",
    roughLocation: "Ikeja, Lagos, NG",
    deviceFingerprint: "iPhone 15 Pro / Safari",
    flagged: false,
  },
  // Multiple scans from distinct browsers & locations for code_soap_flagged -> triggers soft escalation!
  {
    id: "scan_2",
    codeId: "code_soap_flagged",
    codeString: "ASM-3B8R-9Q1Z",
    productId: "prod_dove_soap",
    companyId: "comp_dove",
    timestamp: "2026-09-02T10:11:00Z",
    browserToken: "tok_user_1",
    roughLocation: "Yaba, Lagos, NG",
    deviceFingerprint: "Samsung Galaxy S24 / Chrome",
    flagged: false,
  },
  {
    id: "scan_3",
    codeId: "code_soap_flagged",
    codeString: "ASM-3B8R-9Q1Z",
    productId: "prod_dove_soap",
    companyId: "comp_dove",
    timestamp: "2026-09-05T18:40:00Z",
    browserToken: "tok_user_2",
    roughLocation: "Wuse 2, Abuja, NG",
    deviceFingerprint: "iPhone 14 / Safari",
    flagged: true,
  },
  {
    id: "scan_4",
    codeId: "code_soap_flagged",
    codeString: "ASM-3B8R-9Q1Z",
    productId: "prod_dove_soap",
    companyId: "comp_dove",
    timestamp: "2026-09-10T09:15:00Z",
    browserToken: "tok_user_3",
    roughLocation: "Port Harcourt, NG",
    deviceFingerprint: "Tecno Camon 20 / Chrome",
    flagged: true,
  },
  {
    id: "scan_5",
    codeId: "code_apex_01",
    codeString: "ASM-7N2W-4M8K",
    productId: "prod_apex_omega",
    companyId: "comp_apex",
    timestamp: "2026-09-09T20:10:00Z",
    browserToken: "tok_us_buyer",
    roughLocation: "Austin, Texas, US",
    deviceFingerprint: "Pixel 8 / Chrome",
    flagged: false,
  },
];

const INITIAL_REPORTS: Report[] = [
  {
    id: "rep_101",
    codeId: "code_soap_flagged",
    codeString: "ASM-3B8R-9Q1Z",
    companyId: "comp_dove",
    productName: "African Black Herbal Soap Bar",
    message:
      "Bought this at a local market stall in Alaba. The box looked slightly faded and smelled synthetic compared to the usual batch.",
    contact: "ade.bayo@example.com",
    reviewed: false,
    createdAt: "2026-09-10T10:05:00Z",
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: "tx_101",
    companyId: "comp_dove",
    batchId: "batch_101",
    amount: 249000,
    currency: "NGN",
    status: "paid",
    provider: "paystack",
    reference: "pstk_ref_992140219",
    createdAt: "2026-06-16T14:00:00Z",
  },
  {
    id: "tx_102",
    companyId: "comp_dove",
    batchId: "batch_102",
    amount: 300000,
    currency: "NGN",
    status: "paid",
    provider: "flutterwave",
    reference: "flw_ref_448102941",
    createdAt: "2026-08-01T11:30:00Z",
  },
  {
    id: "tx_103",
    companyId: "comp_apex",
    batchId: "batch_103",
    amount: 870,
    currency: "USD",
    status: "paid",
    provider: "stripe",
    reference: "pi_3NqX92LKso921Jq0",
    createdAt: "2026-07-10T16:00:00Z",
  },
];

// -------------------------------------------------------------
// Reactive Store Implementation
// -------------------------------------------------------------

const STORAGE_KEY = "asemi_engine_v2";

interface AppState {
  companies: Company[];
  products: Product[];
  batches: Batch[];
  codes: Code[];
  scans: Scan[];
  reports: Report[];
  transactions: Transaction[];
  currentUserId: string;
  currentRole: UserRole;
  activeCompanyId: string;
}

class AsemiStore {
  private state: AppState;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.state = this.loadInitialState();
    // Warm up QR codes for initial seed codes
    this.initSeedQrs();
  }

  private async initSeedQrs() {
    let updated = false;
    for (const code of this.state.codes) {
      if (!code.qrUrl) {
        code.qrUrl = await generateQrDataUrl(code.codeString);
        updated = true;
      }
    }
    if (updated) {
      this.saveState();
      this.notify();
    }
  }

  private loadInitialState(): AppState {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.companies)) {
            return parsed;
          }
        }
      } catch (err) {
        console.warn("Failed to parse stored Asemi state, using seed:", err);
      }
    }

    return {
      companies: INITIAL_COMPANIES,
      products: INITIAL_PRODUCTS,
      batches: INITIAL_BATCHES,
      codes: INITIAL_CODES,
      scans: INITIAL_SCANS,
      reports: INITIAL_REPORTS,
      transactions: INITIAL_TRANSACTIONS,
      currentUserId: "user_company_dove",
      currentRole: "COMPANY_USER",
      activeCompanyId: "comp_dove",
    };
  }

  private saveState() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } catch (err) {
        console.error("Storage error:", err);
      }
    }
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  public getState(): AppState {
    return this.state;
  }

  public resetToDefaults() {
    this.state = {
      companies: INITIAL_COMPANIES,
      products: INITIAL_PRODUCTS,
      batches: INITIAL_BATCHES,
      codes: INITIAL_CODES,
      scans: INITIAL_SCANS,
      reports: INITIAL_REPORTS,
      transactions: INITIAL_TRANSACTIONS,
      currentUserId: "user_company_dove",
      currentRole: "COMPANY_USER",
      activeCompanyId: "comp_dove",
    };
    this.initSeedQrs();
    this.saveState();
    this.notify();
  }

  // -----------------------------------------------------------
  // Role & Session management
  // -----------------------------------------------------------

  public setRole(role: UserRole) {
    this.state.currentRole = role;
    this.saveState();
    this.notify();
  }

  public setActiveCompany(companyId: string) {
    this.state.activeCompanyId = companyId;
    this.saveState();
    this.notify();
  }

  public getActiveCompany(): Company {
    const found = this.state.companies.find((c) => c.id === this.state.activeCompanyId);
    return (
      found ||
      this.state.companies[0] || {
        id: "comp_fallback",
        name: "My Company",
        email: "contact@company.com",
        phone: "+1 000 000 0000",
        countryCode: "DEFAULT",
        registrationNumber: "REG-000",
        status: "APPROVED",
        totalCodesGenerated: 0,
        freeCodesUsed: 0,
        createdAt: new Date().toISOString(),
      }
    );
  }

  // -----------------------------------------------------------
  // 4d & 9. Company Onboarding with AI review
  // -----------------------------------------------------------

  public async registerCompany(params: {
    name: string;
    email: string;
    phone: string;
    countryCode: string;
    registrationNumber: string;
    docFile?: File | null;
  }): Promise<Company> {
    const id = `comp_${Date.now().toString(36)}`;

    // Simulate smart AI OCR & Verification check
    const aiScore = Math.floor(88 + Math.random() * 11); // 88 - 98%
    const isNigeria = params.countryCode === "NG";
    const aiFlags: AIFlag[] = [
      {
        type: "success",
        label: "Document Authenticity",
        detail: "Digital registration certificate structure and typography verified.",
      },
      {
        type: "success",
        label: "Registration Number Format",
        detail: `${params.registrationNumber} matches national registry pattern for ${params.countryCode}.`,
      },
      {
        type: "info",
        label: "Region Lock Staged",
        detail: `Locked to ${isNigeria ? "Nigeria (NGN pricing)" : params.countryCode + " (USD pricing)"} upon admin approval.`,
      },
    ];

    if (aiScore > 90) {
      aiFlags.push({
        type: "success",
        label: "Entity Name Cross-Match",
        detail: `Extracted legal name closely matches applicant '${params.name}'.`,
      });
    }

    const newCompany: Company = {
      id,
      name: params.name,
      email: params.email,
      phone: params.phone,
      countryCode: params.countryCode,
      registrationNumber: params.registrationNumber,
      status: "PENDING", // Never auto-approved!
      verificationDocUrl: params.docFile
        ? URL.createObjectURL(params.docFile)
        : "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80",
      aiReviewScore: aiScore,
      aiReviewFlags: aiFlags,
      totalCodesGenerated: 0,
      freeCodesUsed: 0,
      createdAt: new Date().toISOString(),
    };

    this.state.companies = [newCompany, ...this.state.companies];
    this.state.activeCompanyId = id;
    this.saveState();
    this.notify();
    return newCompany;
  }

  // Admin Decisions
  public approveCompany(companyId: string, confirmedCountryCode?: string, adminNote?: string) {
    const comp = this.state.companies.find((c) => c.id === companyId);
    if (!comp) return;

    comp.status = "APPROVED";
    comp.approvedAt = new Date().toISOString();
    if (confirmedCountryCode) {
      comp.countryCode = confirmedCountryCode;
    }
    if (adminNote) {
      comp.adminNote = adminNote;
    }
    this.saveState();
    this.notify();
  }

  public rejectCompany(companyId: string, adminNote: string) {
    const comp = this.state.companies.find((c) => c.id === companyId);
    if (!comp) return;

    comp.status = "REJECTED";
    comp.adminNote = adminNote;
    this.saveState();
    this.notify();
  }

  public requestMoreInfo(companyId: string, adminNote: string) {
    const comp = this.state.companies.find((c) => c.id === companyId);
    if (!comp) return;

    comp.status = "NEEDS_INFO";
    comp.adminNote = adminNote;
    this.saveState();
    this.notify();
  }

  // -----------------------------------------------------------
  // Products Management
  // -----------------------------------------------------------

  public addProduct(
    companyId: string,
    data: { name: string; category: string; description: string; imageUrl?: string },
  ): Product {
    const newProduct: Product = {
      id: `prod_${Date.now().toString(36)}`,
      companyId,
      name: data.name,
      category: data.category || "General",
      description: data.description || "",
      images: data.imageUrl ? [data.imageUrl] : [],
      createdAt: new Date().toISOString(),
    };
    this.state.products = [newProduct, ...this.state.products];
    this.saveState();
    this.notify();
    return newProduct;
  }

  public getCompanyProducts(companyId: string): Product[] {
    return this.state.products.filter((p) => p.companyId === companyId);
  }

  // -----------------------------------------------------------
  // 4b. Code Generation & Batches Engine
  // -----------------------------------------------------------

  public async generateBatch(params: {
    companyId: string;
    productId: string;
    quantity: number;
    paymentProvider: "stripe" | "paystack" | "flutterwave";
    onProgress?: (pct: number) => void;
  }): Promise<{ batch: Batch; generatedCodes: Code[] }> {
    const company = this.state.companies.find((c) => c.id === params.companyId);
    if (!company) throw new Error("Company not found");

    if (company.status !== "APPROVED") {
      throw new Error("Company must be verified and APPROVED before generating codes.");
    }

    const product = this.state.products.find((p) => p.id === params.productId);
    if (!product) throw new Error("Product not found");

    // Server-side recalculation of price
    const calculation = calculatePrice(params.quantity, company);
    if (calculation.requiresQuote) {
      throw new Error("Batch size exceeds 1,000,000 threshold. Custom quote required.");
    }

    const batchId = `batch_${Date.now().toString(36)}`;
    const batch: Batch = {
      id: batchId,
      companyId: params.companyId,
      productId: params.productId,
      productName: product.name,
      quantity: params.quantity,
      amountCharged: calculation.price,
      currency: calculation.currency,
      createdAt: new Date().toISOString(),
    };

    // Update Company metrics atomically
    company.freeCodesUsed += calculation.free;
    company.totalCodesGenerated += params.quantity;

    // Record Transaction
    const tx: Transaction = {
      id: `tx_${Date.now().toString(36)}`,
      companyId: params.companyId,
      batchId,
      amount: calculation.price,
      currency: calculation.currency,
      status: "paid",
      provider: params.paymentProvider,
      reference: `${params.paymentProvider.toUpperCase()}_REF_${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
      createdAt: new Date().toISOString(),
    };

    // Generate individual unique codes with QR codes
    // For large batches in prototype mode, we generate up to 500 tangible codes
    // with QR representations and state tracker
    const tangibleCount = Math.min(params.quantity, 100);
    const newCodes: Code[] = [];

    for (let i = 0; i < tangibleCount; i++) {
      const codeString = generateCodeString();
      const qrUrl = await generateQrDataUrl(codeString);
      newCodes.push({
        id: `code_${Date.now().toString(36)}_${i}`,
        batchId,
        productId: params.productId,
        companyId: params.companyId,
        codeString,
        qrUrl,
        printCount: 0,
        createdAt: new Date().toISOString(),
      });

      if (params.onProgress && i % 10 === 0) {
        params.onProgress(Math.round((i / tangibleCount) * 100));
      }
    }

    if (params.onProgress) params.onProgress(100);

    this.state.batches = [batch, ...this.state.batches];
    this.state.codes = [...newCodes, ...this.state.codes];
    this.state.transactions = [tx, ...this.state.transactions];

    this.saveState();
    this.notify();
    return { batch, generatedCodes: newCodes };
  }

  public recordExport(codeIds: string[]) {
    const set = new Set(codeIds);
    let updated = false;
    for (const c of this.state.codes) {
      if (set.has(c.id)) {
        c.printCount += 1;
        c.exportedAt = new Date().toISOString();
        updated = true;
      }
    }
    if (updated) {
      this.saveState();
      this.notify();
    }
  }

  // -----------------------------------------------------------
  // 4c. Verification & Fraud Scoring Engine
  // -----------------------------------------------------------

  public async verifyCode(params: {
    codeString: string;
    browserToken: string;
    roughLocation?: string;
    deviceFingerprint?: string;
  }): Promise<{
    status: "genuine" | "soft_escalation" | "invalid";
    product?: Product;
    company?: Company;
    batch?: Batch;
    code?: Code;
    scanCount: number;
    distinctVisitors: number;
    isRepeatVisitor: boolean;
    warningMessage?: string;
  }> {
    const raw = params.codeString.trim().toUpperCase();
    // Normalize format
    const cleaned = raw.replace(/\s+/g, "");

    const code = this.state.codes.find(
      (c) =>
        c.codeString.toUpperCase() === cleaned ||
        c.codeString.replace(/-/g, "") === cleaned.replace(/-/g, ""),
    );

    if (!code) {
      return {
        status: "invalid",
        scanCount: 0,
        distinctVisitors: 0,
        isRepeatVisitor: false,
      };
    }

    const product = this.state.products.find((p) => p.id === code.productId);
    const company = this.state.companies.find((c) => c.id === code.companyId);
    const batch = this.state.batches.find((b) => b.id === code.batchId);

    // Existing scans for this code
    const prevScans = this.state.scans.filter((s) => s.codeId === code.id);
    const prevTokens = new Set(prevScans.map((s) => s.browserToken));
    const isRepeatVisitor = prevTokens.has(params.browserToken);

    // If new visitor, distinct visitor count increases
    const distinctVisitors = isRepeatVisitor ? prevTokens.size : prevTokens.size + 1;
    const totalScans = prevScans.length + 1;

    // Fraud Evaluation:
    // If scan count >= 3 from genuinely distinct visitors/locations -> soft escalation
    const hasDifferentLocations =
      new Set(prevScans.map((s) => s.roughLocation).filter(Boolean)).size >= 2;
    const shouldEscalate =
      !isRepeatVisitor && distinctVisitors >= 3 && (hasDifferentLocations || totalScans >= 4);

    // Log the scan record
    const scanId = `scan_${Date.now().toString(36)}`;
    const newScan: Scan = {
      id: scanId,
      codeId: code.id,
      codeString: code.codeString,
      productId: code.productId,
      companyId: code.companyId,
      timestamp: new Date().toISOString(),
      browserToken: params.browserToken,
      roughLocation: params.roughLocation || "Consumer Mobile / Lagos, NG",
      deviceFingerprint: params.deviceFingerprint || "Mobile Browser",
      flagged: shouldEscalate,
    };

    this.state.scans = [newScan, ...this.state.scans];
    this.saveState();
    this.notify();

    if (shouldEscalate) {
      return {
        status: "soft_escalation",
        product,
        company,
        batch,
        code,
        scanCount: totalScans,
        distinctVisitors,
        isRepeatVisitor: false,
        warningMessage:
          "This code has been checked several times from different locations. If something feels off about where you purchased this product, please submit a report below.",
      };
    }

    return {
      status: "genuine",
      product,
      company,
      batch,
      code,
      scanCount: totalScans,
      distinctVisitors,
      isRepeatVisitor,
    };
  }

  public submitReport(params: {
    codeId: string;
    codeString: string;
    companyId: string;
    productName: string;
    message: string;
    contact?: string;
  }): Report {
    const rep: Report = {
      id: `rep_${Date.now().toString(36)}`,
      codeId: params.codeId,
      codeString: params.codeString,
      companyId: params.companyId,
      productName: params.productName,
      message: params.message,
      contact: params.contact,
      reviewed: false,
      createdAt: new Date().toISOString(),
    };

    // Flag associated scan
    const scan = this.state.scans.find((s) => s.codeId === params.codeId);
    if (scan) scan.flagged = true;

    this.state.reports = [rep, ...this.state.reports];
    this.saveState();
    this.notify();
    return rep;
  }

  public markReportReviewed(reportId: string) {
    const r = this.state.reports.find((rep) => rep.id === reportId);
    if (r) {
      r.reviewed = true;
      this.saveState();
      this.notify();
    }
  }

  public clearFlag(codeId: string) {
    for (const scan of this.state.scans) {
      if (scan.codeId === codeId) {
        scan.flagged = false;
      }
    }
    this.saveState();
    this.notify();
  }
}

export const asemiStore = new AsemiStore();
