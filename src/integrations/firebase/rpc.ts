/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStore, genId } from "./mockStore";
import { calculatePriceLocal } from "@/lib/pricing";
import type { Database } from "./types";

type Tables = Database["public"]["Tables"];

function shortHash(input: string | number, n: number): string {
  const s = String(input);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash << 5) - hash + s.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).slice(0, n).padEnd(n, "0");
}

function genCode(i: number): string {
  const a = ("A000" + (i % 9999)).slice(-4);
  const b = ("B000" + ((i * 7) % 9999)).slice(-4);
  const c = ("C000" + ((i * 13) % 9999)).slice(-4);
  return `${a}-${b}-${c}`;
}

function now(): string {
  return new Date().toISOString();
}

export async function has_role({
  _user_id,
  _role,
}: {
  _user_id: string;
  _role: string;
}): Promise<boolean> {
  if (_role === "admin") {
    return _user_id.startsWith("usr_admin_");
  }
  return true;
}

export async function calculate_price({
  _company_id,
  _quantity,
}: {
  _company_id: string;
  _quantity: number;
}): Promise<{ total_amount: number; free_used: number; paid_count: number; breakdown: any[] }> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;
  const company = companies[_company_id];
  const freeUsedBefore = company?.free_codes_used ?? 0;
  const totalGeneratedBefore = company?.total_codes_generated ?? 0;
  const FREE_CODE_LIFETIME_LIMIT = 20;
  const freeCodesRemaining = Math.max(0, FREE_CODE_LIFETIME_LIMIT - freeUsedBefore);

  const result = calculatePriceLocal(_quantity, totalGeneratedBefore, freeCodesRemaining);

  return {
    total_amount: result.totalPrice,
    free_used: result.freeCodesUsed,
    paid_count: _quantity - result.freeCodesUsed,
    breakdown: result.breakdown,
  };
}

export async function company_stats({ _company_id }: { _company_id: string }): Promise<{
  total_products: number;
  total_batches: number;
  total_codes: number;
  total_scans: number;
  total_flagged: number;
  wallet_balance: number;
  free_codes_used: number;
  total_codes_generated: number;
}> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;
  const productsList = Object.values(products as Record<string, any>).filter(
    (p: any) => p.company_id === _company_id,
  );
  const batchesList = Object.values(batches as Record<string, any>).filter(
    (b: any) => b.company_id === _company_id,
  );
  const codesList = Object.values(codes as Record<string, any>).filter(
    (c: any) => c.company_id === _company_id,
  );
  const scansList = Object.values(scans as Record<string, any>).filter(
    (s: any) => s.company_id === _company_id,
  );
  const flaggedRows = Object.values((flagged_codes || {}) as Record<string, any>).filter(
    (f: any) => {
      if (f.company_id) return f.company_id === _company_id;
      if (f.code_id && codes[f.code_id]) {
        return codes[f.code_id].company_id === _company_id;
      }
      return false;
    },
  );

  const company = companies[_company_id];

  return {
    total_products: productsList.length,
    total_batches: batchesList.length,
    total_codes: codesList.length,
    total_scans: scansList.length,
    total_flagged: flaggedRows.length,
    wallet_balance: company?.wallet_balance ?? 0,
    free_codes_used: company?.free_codes_used ?? 0,
    total_codes_generated: company?.total_codes_generated ?? 0,
  };
}

export async function generate_batch_paid({
  _company_id,
  _product_id,
  _quantity,
}: {
  _company_id: string;
  _product_id: string;
  _quantity: number;
}): Promise<{ batch_id: string; code_ids: string[] }> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;

  const amount_needed = await calculate_price({ _company_id, _quantity });

  const company = companies[_company_id];
  if (!company) throw new Error("Company not found");

  if (
    amount_needed.total_amount > 0 &&
    (company.wallet_balance ?? 0) < amount_needed.total_amount
  ) {
    throw new Error("Insufficient wallet balance. Please top up");
  }

  company.wallet_balance = (+company.wallet_balance || 0) - amount_needed.total_amount;
  company.free_codes_used = (+company.free_codes_used || 0) + amount_needed.free_used;
  company.total_codes_generated = (+company.total_codes_generated || 0) + _quantity;
  company.updated_at = now();

  const existingWallet = (Object.values(wallets) as any[]).find(
    (w: any) => w.company_id === _company_id,
  );
  if (existingWallet) {
    existingWallet.credit_balance = company.wallet_balance;
    existingWallet.lifetime_spent =
      (+existingWallet.lifetime_spent || 0) + amount_needed.total_amount;
    existingWallet.updated_at = now();
  }

  const batchId = genId("bat");
  const batchNumber = `B${new Date().getFullYear()}-${String(1000 + Object.keys(batches).length + 1).slice(-5)}`;

  batches[batchId] = {
    id: batchId,
    batch_number: batchNumber,
    company_id: _company_id,
    product_id: _product_id,
    quantity: _quantity,
    amount_charged: amount_needed.total_amount,
    status: "generated",
    created_at: now(),
    exported_at: null,
  };

  const code_ids: string[] = [];
  for (let i = 0; i < _quantity; i++) {
    const codeId = genId("cod");
    codes[codeId] = {
      id: codeId,
      code_string: genCode(i),
      code: genCode(i),
      batch_id: batchId,
      company_id: _company_id,
      product_id: _product_id,
      status: "active",
      flagged: false,
      scan_count: 0,
      print_count: 0,
      review_status: "none",
      created_at: now(),
      exported_at: null,
      last_scanned_at: null,
    };
    code_ids.push(codeId);
  }

  const invoiceId = genId("inv");
  invoices[invoiceId] = {
    id: invoiceId,
    company_id: _company_id,
    amount: amount_needed.total_amount,
    codes_applied: _quantity,
    currency: "NGN",
    description: "Batch generation",
    kind: "batch_generation",
    payment_method: "wallet",
    status: "paid",
    reference: null,
    created_at: now(),
    paid_at: now(),
  };

  return { batch_id: batchId, code_ids };
}

export async function mark_codes_exported({ _batch_id }: { _batch_id: string }): Promise<number> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;

  const matching = (Object.values(codes) as any[]).filter((c: any) => c.batch_id === _batch_id);
  const ts = now();
  for (const code of matching) {
    code.exported_at = ts;
    code.print_count = (+code.print_count || 0) + 1;
  }

  const batch = batches[_batch_id];
  if (batch) {
    batch.status = "exported";
    batch.exported_at = ts;
  }

  return matching.length;
}

export async function topup_wallet({
  _company_id,
  _amount,
  _description,
}: {
  _company_id: string;
  _amount: number;
  _description?: string;
}): Promise<{ invoice_id: string; new_balance: number }> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;

  const company = companies[_company_id];
  if (!company) throw new Error("Company not found");

  company.wallet_balance = (+company.wallet_balance || 0) + _amount;
  company.updated_at = now();

  const walletEntry = (Object.values(wallets) as any[]).find(
    (w: any) => w.company_id === _company_id,
  );
  if (walletEntry) {
    walletEntry.credit_balance = company.wallet_balance;
    walletEntry.lifetime_topup = (+walletEntry.lifetime_topup || 0) + _amount;
    walletEntry.updated_at = now();
  } else {
    const wid = genId("wal");
    wallets[wid] = {
      id: wid,
      company_id: _company_id,
      credit_balance: company.wallet_balance,
      lifetime_spent: 0,
      lifetime_topup: _amount,
      created_at: now(),
      updated_at: now(),
    };
  }

  const invoiceId = genId("inv");
  const refCode = "REF-" + shortHash(invoiceId + Date.now(), 8).toUpperCase();
  invoices[invoiceId] = {
    id: invoiceId,
    company_id: _company_id,
    amount: _amount,
    codes_applied: 0,
    currency: "NGN",
    description: _description || "Wallet top-up",
    kind: "wallet_topup",
    payment_method: "card",
    status: "paid",
    reference: refCode,
    reference_code: refCode,
    created_at: now(),
    paid_at: now(),
  };

  return { invoice_id: invoiceId, new_balance: company.wallet_balance };
}

export async function admin_approve_company({
  _company_id,
  _note,
}: {
  _company_id: string;
  _note?: string;
}): Promise<boolean> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;

  const company = companies[_company_id];
  if (!company) throw new Error("Company not found");

  const wasApproved = company.status === "approved";
  company.status = "approved";
  if (_note !== undefined) {
    company.admin_note = _note;
  }
  company.updated_at = now();

  if (!wasApproved) {
    const bonus = 20 * 150;
    company.wallet_balance = (+company.wallet_balance || 0) + bonus;

    const walletEntry = (Object.values(wallets) as any[]).find(
      (w: any) => w.company_id === _company_id,
    );
    if (walletEntry) {
      walletEntry.credit_balance = company.wallet_balance;
      walletEntry.updated_at = now();
    } else {
      const wid = genId("wal");
      wallets[wid] = {
        id: wid,
        company_id: _company_id,
        credit_balance: company.wallet_balance,
        lifetime_spent: 0,
        lifetime_topup: bonus,
        created_at: now(),
        updated_at: now(),
      };
    }
  }

  return true;
}

export async function admin_reject_company({
  _company_id,
  _note,
}: {
  _company_id: string;
  _note?: string;
}): Promise<boolean> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;
  const company = companies[_company_id];
  if (!company) throw new Error("Company not found");

  company.status = "rejected";
  if (_note !== undefined) {
    company.admin_note = _note;
  }
  company.updated_at = now();
  return true;
}

export async function admin_request_info({
  _company_id,
  _note,
}: {
  _company_id: string;
  _note?: string;
}): Promise<boolean> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;
  const company = companies[_company_id];
  if (!company) throw new Error("Company not found");

  company.status = "needs_info";
  if (_note !== undefined) {
    company.admin_note = _note;
  }
  company.updated_at = now();
  return true;
}

export async function set_code_review_status({
  _flagged_id,
  _status,
  _note,
}: {
  _flagged_id: string;
  _status: string;
  _note?: string;
}): Promise<boolean> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;
  const flagged = flagged_codes[_flagged_id];
  if (!flagged) return true;

  flagged.review_status = _status;
  if (_note !== undefined) {
    flagged.review_note = _note;
  }
  flagged.reviewer_id = "usr_admin_demo_001";
  const shouldStamp = ["reviewed", "dismissed", "confirmed"].includes(_status);
  if (shouldStamp) {
    flagged.reviewed_at = now();
  }
  return true;
}

export async function admin_review_report({
  _report_id,
}: {
  _report_id: string;
}): Promise<boolean> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;
  const report = reports[_report_id];
  if (!report) throw new Error("Report not found");

  report.reviewed = true;
  report.reviewed_at = now();
  return true;
}

export async function lookup_code({ _code }: { _code: string }): Promise<any> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;

  const codeRow = (Object.values(codes) as any[]).find(
    (c: any) => c.code_string === _code || c.code === _code,
  );
  if (!codeRow) return null;

  const product = products[codeRow.product_id];
  const company = companies[codeRow.company_id];

  return {
    ...codeRow,
    products: product
      ? {
          id: product.id,
          name: product.name,
          sku: product.sku,
          image_urls: product.images,
          images: product.images,
          category: product.category,
          description: product.description,
        }
      : undefined,
    companies: company
      ? {
          id: company.id,
          name: company.name,
          logo_url: company.logo_url,
          status: company.status,
        }
      : undefined,
  };
}

export async function record_scan({
  _code,
  _city,
  _country,
}: {
  _code: string;
  _city?: string;
  _country?: string;
}): Promise<boolean> {
  const { collections } = getStore();
  const {
    companies,
    products,
    batches,
    codes,
    scans,
    flagged_codes,
    reports,
    wallets,
    invoices,
    users,
  } = collections as any;

  const codeRow = (Object.values(codes) as any[]).find(
    (c: any) => c.code_string === _code || c.code === _code,
  );
  if (codeRow) {
    codeRow.scan_count = (+codeRow.scan_count || 0) + 1;
    codeRow.last_scanned_at = now();
  }

  const scanId = genId("scn");
  scans[scanId] = {
    id: scanId,
    code_id: codeRow?.id || null,
    code_string: _code,
    batch_id: codeRow?.batch_id || "",
    company_id: codeRow?.company_id || "",
    product_id: codeRow?.product_id || "",
    city: _city || null,
    country: _country || null,
    browser_token: null,
    device_fingerprint: null,
    flagged: false,
    scanned_at: now(),
  };

  return true;
}

export const RPC: Record<string, (args: any) => Promise<any>> = {
  has_role,
  calculate_price,
  company_stats,
  generate_batch_paid,
  mark_codes_exported,
  topup_wallet,
  admin_approve_company,
  admin_reject_company,
  admin_request_info,
  set_code_review_status,
  admin_review_report,
  lookup_code,
  record_scan,
};
