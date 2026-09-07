/* eslint-disable @typescript-eslint/no-explicit-any */
const iso = (d: string) => new Date(d).toISOString();

const USER_COMPANY = {
  id: "usr_company_demo_001",
  email: "company@asemi.demo",
};

const USER_ADMIN = {
  id: "usr_admin_demo_001",
  email: "admin@asemi.demo",
};

const USER_PENDING = {
  id: "usr_pending_003",
  email: "pending@asemi.demo",
};

const USER_NEEDSINFO = {
  id: "usr_needsinfo_004",
  email: "needsinfo@asemi.demo",
};

const COMPANY_APPROVED = {
  id: "com_approved_001",
  owner_id: USER_COMPANY.id,
  name: "Nora Consumer Goods Ltd",
  registration_number: "RC-1234567",
  address: "14 Allen Avenue, Ikeja, Lagos",
  phone: "+234 801 234 5678",
  email: "hello@noracg.example",
  category: "Personal care",
  logo_url: "https://mock-fb.local/product-images/seed/company-logo-nora.svg",
  document_url: null,
  status: "approved" as const,
  admin_note: null,
  created_at: iso("2026-05-01"),
  updated_at: iso("2026-05-01"),
  free_codes_used: 20,
  total_codes_generated: 520,
  wallet_balance: 225000,
};

const COMPANY_PENDING = {
  id: "com_pending_002",
  owner_id: USER_PENDING.id,
  name: "Ivory Dental Co.",
  registration_number: "RC-9988776",
  address: "20 Borno Way, Yaba, Lagos",
  phone: "+234 802 111 2233",
  email: "contact@ivorydental.example",
  category: "Oral care",
  logo_url: null,
  document_url: null,
  status: "pending" as const,
  admin_note: null,
  created_at: iso("2026-08-15"),
  updated_at: iso("2026-08-15"),
  free_codes_used: 0,
  total_codes_generated: 0,
  wallet_balance: 0,
};

const COMPANY_NEEDS_INFO = {
  id: "com_needs_003",
  owner_id: USER_NEEDSINFO.id,
  name: "Malomo Foods Enterprise",
  registration_number: null,
  address: null,
  phone: null,
  email: "hello@malomofoods.example",
  category: "Food & beverage",
  logo_url: null,
  document_url: null,
  status: "needs_info" as const,
  admin_note: "Please upload your CAC registration certificate.",
  created_at: iso("2026-08-20"),
  updated_at: iso("2026-08-22"),
  free_codes_used: 0,
  total_codes_generated: 0,
  wallet_balance: 0,
};

const PRODUCT_TOOTHPASTE = {
  id: "prd_tooth_001",
  company_id: COMPANY_APPROVED.id,
  name: "Nora Bright Toothpaste 100g",
  sku: "NORA-BR-TP-100",
  category: "Personal care",
  description: "Fluoride toothpaste with mint",
  image_urls: [
    "https://mock-fb.local/product-images/seed/toothpaste-1.jpg",
    "https://mock-fb.local/product-images/seed/toothpaste-2.jpg",
  ],
  specs: { net_content: "100g", flavor: "Cool mint", expiry: "24 months" },
  created_at: iso("2026-05-05"),
};

const PRODUCT_SHAMPOO = {
  id: "prd_sham_002",
  company_id: COMPANY_APPROVED.id,
  name: "Nora Silky Shampoo",
  sku: "NORA-SH-SH-250",
  category: "Personal care",
  description: "Sulfate-free silky shampoo for all hair types",
  image_urls: ["https://mock-fb.local/product-images/seed/shampoo-1.jpg"],
  specs: { volume: "250ml" },
  created_at: iso("2026-05-10"),
};

const PRODUCT_COCOA = {
  id: "prd_coco_003",
  company_id: COMPANY_APPROVED.id,
  name: "Malomo Pure Cocoa Powder 500g",
  sku: "MAL-CO-PW-500",
  category: "Food & beverage",
  description: "Unsweetened pure cocoa powder for baking and drinks",
  image_urls: ["https://mock-fb.local/product-images/seed/cocoa-1.jpg"],
  specs: { net_weight: "500g", origin: "Nigeria" },
  created_at: iso("2026-06-01"),
};

const PRODUCT_CREAM = {
  id: "prd_crea_004",
  company_id: COMPANY_APPROVED.id,
  name: "Ivory Cavity Protection Cream",
  sku: "IVO-CA-CR-75",
  category: "Personal care",
  description: "Fluoride cavity protection cream for sensitive teeth",
  image_urls: [
    "https://mock-fb.local/product-images/seed/cream-1.jpg",
    "https://mock-fb.local/product-images/seed/cream-2.jpg",
    "https://mock-fb.local/product-images/seed/cream-3.jpg",
  ],
  specs: { net_content: "75ml", active: "Sodium Fluoride 0.243%" },
  created_at: iso("2026-06-15"),
};

const YESTERDAY = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

const BATCH_1 = {
  id: "bat_001",
  company_id: COMPANY_APPROVED.id,
  product_id: PRODUCT_TOOTHPASTE.id,
  batch_number: "B2026-05001",
  quantity: 500,
  amount_charged: 64500,
  status: "exported" as const,
  exported_at: YESTERDAY,
  created_at: iso("2026-08-01"),
};

const BATCH_2 = {
  id: "bat_002",
  company_id: COMPANY_APPROVED.id,
  product_id: PRODUCT_SHAMPOO.id,
  batch_number: "B2026-05002",
  quantity: 20,
  amount_charged: 0,
  status: "generated" as const,
  exported_at: null,
  created_at: iso("2026-08-10"),
};

const BATCH_3 = {
  id: "bat_003",
  company_id: COMPANY_APPROVED.id,
  product_id: PRODUCT_COCOA.id,
  batch_number: "B2026-05003",
  quantity: 50,
  amount_charged: 7500,
  status: "generated" as const,
  exported_at: null,
  created_at: iso("2026-08-20"),
};

const genCodePattern = (prefix: string, n: number) => `${prefix}-${String(n).padStart(4, "0")}`;

const codesB1 = Array.from({ length: 25 }, (_, i) => ({
  id: `cod_b1_${String(i + 1).padStart(3, "0")}`,
  batch_id: BATCH_1.id,
  company_id: COMPANY_APPROVED.id,
  product_id: PRODUCT_TOOTHPASTE.id,
  code: genCodePattern("AAAA-AAAA", i + 1),
  status: "active" as const,
  print_count: i < 6 ? 3 : 1,
  exported_at: YESTERDAY,
  created_at: BATCH_1.created_at,
}));

const codesB2 = Array.from({ length: 20 }, (_, i) => ({
  id: `cod_b2_${String(i + 1).padStart(3, "0")}`,
  batch_id: BATCH_2.id,
  company_id: COMPANY_APPROVED.id,
  product_id: PRODUCT_SHAMPOO.id,
  code: genCodePattern("BBBB-BBBB", i + 1),
  status: "active" as const,
  print_count: 0,
  exported_at: null,
  created_at: BATCH_2.created_at,
}));

const codesB3 = Array.from({ length: 10 }, (_, i) => ({
  id: `cod_b3_${String(i + 1).padStart(3, "0")}`,
  batch_id: BATCH_3.id,
  company_id: COMPANY_APPROVED.id,
  product_id: PRODUCT_COCOA.id,
  code: genCodePattern("CCCC-CCCC", i + 1),
  status: "active" as const,
  print_count: 0,
  exported_at: null,
  created_at: BATCH_3.created_at,
}));

const FLAG_CODE_ID = codesB1[5]!.id;
const FLAG_CODE_STRING = codesB1[5]!.code;

const scanDates = [
  "2026-08-08T10:23:00",
  "2026-08-11T14:45:00",
  "2026-08-14T08:12:00",
  "2026-08-16T19:30:00",
  "2026-08-19T11:05:00",
  "2026-08-22T16:40:00",
  "2026-08-25T09:15:00",
  "2026-08-28T13:22:00",
  "2026-08-31T17:55:00",
  "2026-09-02T10:30:00",
  "2026-09-04T15:10:00",
  "2026-09-06T08:45:00",
];

const cities = [
  { city: "Lagos", country: "Nigeria", lat: "6.5244", lon: "3.3792" },
  { city: "Abuja", country: "Nigeria", lat: "9.0765", lon: "7.3986" },
  { city: "Port Harcourt", country: "Nigeria", lat: "4.8156", lon: "7.0498" },
  { city: "Ibadan", country: "Nigeria", lat: "7.3776", lon: "3.9470" },
  { city: "Kano", country: "Nigeria", lat: "12.0022", lon: "8.5911" },
  { city: "Benin", country: "Nigeria", lat: "6.3391", lon: "5.6174" },
];

const scans = [];
for (let i = 0; i < 6; i++) {
  for (let j = 0; j < 2; j++) {
    const idx = i * 2 + j;
    const codeObj = codesB1[i];
    if (!codeObj) continue;
    const loc = cities[i];
    if (!loc) continue;
    scans.push({
      id: `scan_${String(idx + 1).padStart(3, "0")}`,
      code_id: codeObj.id,
      code: codeObj.code,
      scanned_at: iso(scanDates[idx] ?? ""),
      city: loc.city ?? "Unknown",
      country: loc.country ?? "Unknown",
      ip_address: `192.168.${10 + idx}.${20 + idx}`,
      user_agent:
        idx % 2 === 0
          ? "Mozilla/5.0 (Linux; Android 13) Chrome/120.0"
          : "Mozilla/5.0 (iPhone; iOS 17) Safari/17.0",
      latitude: loc.lat ?? "0.0000",
      longitude: loc.lon ?? "0.0000",
      is_flagged: codeObj.id === FLAG_CODE_ID ? true : false,
    });
  }
}

const flaggedCode = {
  id: "flg_001",
  code_id: FLAG_CODE_ID,
  company_id: COMPANY_APPROVED.id,
  reason: "Unusual scan count: 12 scans in 24h from 5 different cities",
  flagged_at: iso("2026-09-06T09:00:00"),
  review_status: "pending" as const,
  reviewer_id: null,
  reviewed_at: null,
};

const report = {
  id: "rep_001",
  code_id: FLAG_CODE_ID,
  code: FLAG_CODE_STRING,
  reporter_email: "consumer.concern@example.ng",
  message:
    "I think this toothpaste is counterfeit. The packaging looks different from the one I usually buy and the mint flavor seems weaker.",
  submitted_at: iso("2026-09-06T09:15:00"),
  reviewed: false,
  reviewer_id: null,
  reviewed_at: null,
};

const wallets = [
  {
    id: "wal_001",
    company_id: COMPANY_APPROVED.id,
    balance: 225000,
    updated_at: YESTERDAY,
  },
  {
    id: "wal_002",
    company_id: COMPANY_PENDING.id,
    balance: 0,
    updated_at: COMPANY_PENDING.created_at,
  },
];

const invoices = [
  {
    id: "inv_001",
    company_id: COMPANY_APPROVED.id,
    amount: 100000,
    description: "Initial wallet top-up",
    payment_method: "card" as const,
    status: "paid" as const,
    created_at: iso("2026-05-02T10:00:00"),
    reference_code: "INV-DEMO-001",
  },
  {
    id: "inv_002",
    company_id: COMPANY_APPROVED.id,
    amount: 64500,
    description: "Batch B2026-05001",
    payment_method: "wallet" as const,
    status: "paid" as const,
    created_at: iso("2026-08-01T14:30:00"),
    reference_code: "INV-DEMO-002",
  },
];

export const SEED_DATA: Record<string, any[]> = {
  users: [USER_COMPANY, USER_ADMIN, USER_PENDING, USER_NEEDSINFO],
  companies: [COMPANY_APPROVED, COMPANY_PENDING, COMPANY_NEEDS_INFO],
  products: [PRODUCT_TOOTHPASTE, PRODUCT_SHAMPOO, PRODUCT_COCOA, PRODUCT_CREAM],
  batches: [BATCH_1, BATCH_2, BATCH_3],
  codes: [...codesB1, ...codesB2, ...codesB3],
  scans,
  flagged_codes: [flaggedCode],
  reports: [report],
  wallets,
  invoices,
};
