/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-object-type */
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
        };
        Insert: {
          id?: string;
          email: string;
        };
        Update: {
          id?: string;
          email?: string;
        };
      };
      companies: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          registration_number?: string;
          address?: string;
          phone?: string;
          email?: string;
          category?: string;
          logo_url?: string | null;
          document_url?: string | null;
          status: "pending" | "approved" | "needs_info" | "rejected";
          admin_note?: string;
          created_at: string;
          updated_at: string;
          free_codes_used: number;
          total_codes_generated: number;
          wallet_balance: number;
          credit_balance?: number;
          lifetime_spent?: number;
          lifetime_topup?: number;
          subscription_plan?: "free" | "starter" | "growth" | "scale" | null;
          plan_code_limit?: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          registration_number?: string;
          address?: string;
          phone?: string;
          email?: string;
          category?: string;
          logo_url?: string | null;
          document_url?: string | null;
          status?: "pending" | "approved" | "needs_info" | "rejected";
          admin_note?: string;
          created_at?: string;
          updated_at?: string;
          free_codes_used?: number;
          total_codes_generated?: number;
          wallet_balance?: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          registration_number?: string;
          address?: string;
          phone?: string;
          email?: string;
          category?: string;
          logo_url?: string | null;
          document_url?: string | null;
          status?: "pending" | "approved" | "needs_info" | "rejected";
          admin_note?: string;
          created_at?: string;
          updated_at?: string;
          free_codes_used?: number;
          total_codes_generated?: number;
          wallet_balance?: number;
        };
      };
      products: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          sku?: string;
          category?: string;
          description?: string;
          image_urls: string[];
          images?: string[];
          specs?: Record<string, any>;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          sku?: string;
          category?: string;
          description?: string;
          image_urls?: string[];
          specs?: Record<string, any>;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          name?: string;
          sku?: string;
          category?: string;
          description?: string;
          image_urls?: string[];
          specs?: Record<string, any>;
          created_at?: string;
        };
      };
      batches: {
        Row: {
          id: string;
          company_id: string;
          product_id: string;
          batch_number: string;
          quantity: number;
          amount_charged: number;
          status: "draft" | "generated" | "exported" | "paid" | "ready" | "open" | "processing";
          exported_at?: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          product_id: string;
          batch_number: string;
          quantity: number;
          amount_charged?: number;
          status?: "draft" | "generated" | "exported" | "paid" | "ready" | "open" | "processing";
          exported_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          product_id?: string;
          batch_number?: string;
          quantity?: number;
          amount_charged?: number;
          status?: "draft" | "generated" | "exported" | "paid" | "ready" | "open" | "processing";
          exported_at?: string;
          created_at?: string;
        };
      };
      codes: {
        Row: {
          id: string;
          batch_id: string;
          company_id: string;
          product_id: string;
          code: string;
          status: "active" | "flagged" | "revoked";
          print_count: number;
          exported_at?: string;
          created_at: string;
          review_status?: "pending" | "reviewed" | "dismissed" | "confirmed" | null;
          code_string?: string;
          flagged?: boolean;
          scan_count?: number;
          last_scanned_at?: string | null;
        };
        Insert: {
          id?: string;
          batch_id: string;
          company_id: string;
          product_id: string;
          code: string;
          status?: "active" | "flagged" | "revoked";
          print_count?: number;
          exported_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          batch_id?: string;
          company_id?: string;
          product_id?: string;
          code?: string;
          status?: "active" | "flagged" | "revoked";
          print_count?: number;
          exported_at?: string;
          created_at?: string;
        };
      };
      scans: {
        Row: {
          id: string;
          code_id: string;
          code: string;
          scanned_at: string;
          city?: string;
          country?: string;
          ip_address?: string;
          user_agent?: string;
          latitude?: string;
          longitude?: string;
          is_flagged: boolean;
        };
        Insert: {
          id?: string;
          code_id: string;
          code: string;
          scanned_at?: string;
          city?: string;
          country?: string;
          ip_address?: string;
          user_agent?: string;
          latitude?: string;
          longitude?: string;
          is_flagged?: boolean;
        };
        Update: {
          id?: string;
          code_id?: string;
          code?: string;
          scanned_at?: string;
          city?: string;
          country?: string;
          ip_address?: string;
          user_agent?: string;
          latitude?: string;
          longitude?: string;
          is_flagged?: boolean;
        };
      };
      flagged_codes: {
        Row: {
          id: string;
          code_id: string;
          company_id: string;
          reason: string;
          flagged_at: string;
          review_status: "pending" | "reviewed" | "dismissed" | "confirmed";
          reviewer_id?: string;
          reviewed_at?: string;
        };
        Insert: {
          id?: string;
          code_id: string;
          company_id: string;
          reason: string;
          flagged_at?: string;
          review_status?: "pending" | "reviewed" | "dismissed" | "confirmed";
          reviewer_id?: string;
          reviewed_at?: string;
        };
        Update: {
          id?: string;
          code_id?: string;
          company_id?: string;
          reason?: string;
          flagged_at?: string;
          review_status?: "pending" | "reviewed" | "dismissed" | "confirmed";
          reviewer_id?: string;
          reviewed_at?: string;
        };
      };
      reports: {
        Row: {
          id: string;
          code_id: string;
          code: string;
          reporter_email?: string;
          message: string;
          submitted_at: string;
          reviewed: boolean;
          reviewer_id?: string;
          reviewed_at?: string;
        };
        Insert: {
          id?: string;
          code_id: string;
          code: string;
          reporter_email?: string;
          message: string;
          submitted_at?: string;
          reviewed?: boolean;
          reviewer_id?: string;
          reviewed_at?: string;
        };
        Update: {
          id?: string;
          code_id?: string;
          code?: string;
          reporter_email?: string;
          message?: string;
          submitted_at?: string;
          reviewed?: boolean;
          reviewer_id?: string;
          reviewed_at?: string;
        };
      };
      wallets: {
        Row: {
          id: string;
          company_id: string;
          balance: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          balance?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          balance?: number;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          company_id: string;
          amount: number;
          description?: string;
          payment_method: "card" | "wallet" | "transfer";
          status: "paid" | "pending" | "failed";
          created_at: string;
          reference_code?: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          amount: number;
          description?: string;
          payment_method: "card" | "wallet" | "transfer";
          status?: "paid" | "pending" | "failed";
          created_at?: string;
          reference_code?: string;
        };
        Update: {
          id?: string;
          company_id?: string;
          amount?: number;
          description?: string;
          payment_method?: "card" | "wallet" | "transfer";
          status?: "paid" | "pending" | "failed";
          created_at?: string;
          reference_code?: string;
        };
      };
    };
    Views: {};
    Functions: {
      has_role: {
        Args: { _user_id: string; _role: string };
        Returns: boolean;
      };
      calculate_price: {
        Args: { _company_id: string; _quantity: number };
        Returns: {
          total_amount: number;
          free_used: number;
          paid_count: number;
          breakdown: Array<{
            bracket: string;
            count: number;
            unit_price: number;
            subtotal: number;
          }>;
        };
      };
      company_stats: {
        Args: { _company_id: string };
        Returns: {
          total_products: number;
          total_batches: number;
          total_codes: number;
          total_scans: number;
          total_flagged: number;
          wallet_balance: number;
          free_codes_used: number;
          total_codes_generated: number;
        };
      };
      generate_batch_paid: {
        Args: { _company_id: string; _product_id: string; _quantity: number };
        Returns: { batch_id: string; code_ids: string[] } | null;
      };
      mark_codes_exported: {
        Args: { _batch_id: string };
        Returns: number;
      };
      topup_wallet: {
        Args: { _company_id: string; _amount: number; _description?: string };
        Returns: { invoice_id: string; new_balance: number };
      };
      admin_approve_company: {
        Args: { _company_id: string; _note?: string };
        Returns: boolean;
      };
      admin_reject_company: {
        Args: { _company_id: string; _note?: string };
        Returns: boolean;
      };
      admin_request_info: {
        Args: { _company_id: string; _note?: string };
        Returns: boolean;
      };
      set_code_review_status: {
        Args: {
          _flagged_id: string;
          _status: "pending" | "reviewed" | "dismissed" | "confirmed";
          _note?: string;
        };
        Returns: boolean;
      };
      admin_review_report: {
        Args: { _report_id: string };
        Returns: boolean;
      };
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

export type Json = any | Record<string, any> | unknown | null;
