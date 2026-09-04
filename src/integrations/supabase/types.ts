export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      batches: {
        Row: {
          batch_number: string
          company_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
          status: string
        }
        Insert: {
          batch_number: string
          company_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          status?: string
        }
        Update: {
          batch_number?: string
          company_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      codes: {
        Row: {
          batch_id: string
          code_string: string
          company_id: string
          created_at: string
          flagged: boolean
          id: string
          last_scanned_at: string | null
          product_id: string
          review_status: Database["public"]["Enums"]["review_status"]
          scan_count: number
        }
        Insert: {
          batch_id: string
          code_string: string
          company_id: string
          created_at?: string
          flagged?: boolean
          id?: string
          last_scanned_at?: string | null
          product_id: string
          review_status?: Database["public"]["Enums"]["review_status"]
          scan_count?: number
        }
        Update: {
          batch_id?: string
          code_string?: string
          company_id?: string
          created_at?: string
          flagged?: boolean
          id?: string
          last_scanned_at?: string | null
          product_id?: string
          review_status?: Database["public"]["Enums"]["review_status"]
          scan_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "codes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string
          admin_note: string | null
          ai_confidence: number | null
          ai_flags: Json
          category: string
          created_at: string
          document_url: string | null
          email: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          phone: string
          plan_code_limit: number
          registration_number: string
          status: Database["public"]["Enums"]["company_status"]
          subscription_plan: string
          updated_at: string
        }
        Insert: {
          address: string
          admin_note?: string | null
          ai_confidence?: number | null
          ai_flags?: Json
          category: string
          created_at?: string
          document_url?: string | null
          email: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          phone: string
          plan_code_limit?: number
          registration_number: string
          status?: Database["public"]["Enums"]["company_status"]
          subscription_plan?: string
          updated_at?: string
        }
        Update: {
          address?: string
          admin_note?: string | null
          ai_confidence?: number | null
          ai_flags?: Json
          category?: string
          created_at?: string
          document_url?: string | null
          email?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          phone?: string
          plan_code_limit?: number
          registration_number?: string
          status?: Database["public"]["Enums"]["company_status"]
          subscription_plan?: string
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          company_id: string
          created_at: string
          description: string
          id: string
          images: string[]
          name: string
          sku: string | null
          specs: Json
        }
        Insert: {
          category: string
          company_id: string
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          name: string
          sku?: string | null
          specs?: Json
        }
        Update: {
          category?: string
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          images?: string[]
          name?: string
          sku?: string | null
          specs?: Json
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          code_id: string | null
          code_string: string
          company_id: string | null
          contact: string | null
          created_at: string
          id: string
          message: string
          reviewed: boolean
        }
        Insert: {
          code_id?: string | null
          code_string: string
          company_id?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          message: string
          reviewed?: boolean
        }
        Update: {
          code_id?: string | null
          code_string?: string
          company_id?: string | null
          contact?: string | null
          created_at?: string
          id?: string
          message?: string
          reviewed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reports_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          batch_id: string
          browser_token: string | null
          city: string | null
          code_id: string
          company_id: string
          country: string | null
          device_fingerprint: string | null
          flagged: boolean
          id: string
          product_id: string
          scanned_at: string
        }
        Insert: {
          batch_id: string
          browser_token?: string | null
          city?: string | null
          code_id: string
          company_id: string
          country?: string | null
          device_fingerprint?: string | null
          flagged?: boolean
          id?: string
          product_id: string
          scanned_at?: string
        }
        Update: {
          batch_id?: string
          browser_token?: string | null
          city?: string | null
          code_id?: string
          company_id?: string
          country?: string | null
          device_fingerprint?: string | null
          flagged?: boolean
          id?: string
          product_id?: string
          scanned_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scans_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_company_overview: {
        Args: never
        Returns: {
          code_count: number
          created_at: string
          email: string
          id: string
          name: string
          product_count: number
          registration_number: string
          status: Database["public"]["Enums"]["company_status"]
          subscription_plan: string
        }[]
      }
      batch_stats: {
        Args: { _company_id: string }
        Returns: {
          batch_id: string
          flagged: number
          genuine: number
          scanned_codes: number
        }[]
      }
      company_is_approved: { Args: { _company_id: string }; Returns: boolean }
      company_stats: { Args: { _company_id: string }; Returns: Json }
      generate_batch: {
        Args: { _product_id: string; _quantity: number }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      owns_company: { Args: { _company_id: string }; Returns: boolean }
      platform_metrics: { Args: never; Returns: Json }
      random_code: { Args: never; Returns: string }
      set_code_review: {
        Args: {
          _code_id: string
          _status: Database["public"]["Enums"]["review_status"]
        }
        Returns: undefined
      }
      submit_report: {
        Args: { _code: string; _contact: string; _message: string }
        Returns: undefined
      }
      verify_code: {
        Args: {
          _city: string
          _code: string
          _country: string
          _fingerprint: string
          _token: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "company"
      company_status: "pending" | "approved" | "needs_info" | "rejected"
      review_status: "none" | "open" | "reviewed" | "escalated"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "company"],
      company_status: ["pending", "approved", "needs_info", "rejected"],
      review_status: ["none", "open", "reviewed", "escalated"],
    },
  },
} as const
