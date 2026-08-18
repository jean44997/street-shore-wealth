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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_audit: {
        Row: {
          action: string
          admin_email: string
          amount: number
          created_at: string
          deposit_id: string | null
          id: string
          note: string
          target_email: string
          target_name: string
          target_profile_id: string | null
        }
        Insert: {
          action: string
          admin_email: string
          amount?: number
          created_at?: string
          deposit_id?: string | null
          id?: string
          note?: string
          target_email?: string
          target_name?: string
          target_profile_id?: string | null
        }
        Update: {
          action?: string
          admin_email?: string
          amount?: number
          created_at?: string
          deposit_id?: string | null
          id?: string
          note?: string
          target_email?: string
          target_name?: string
          target_profile_id?: string | null
        }
        Relationships: []
      }
      admin_emails: {
        Row: {
          created_at: string
          email: string
        }
        Insert: {
          created_at?: string
          email: string
        }
        Update: {
          created_at?: string
          email?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          admin_note: string
          amount: number
          created_at: string
          credited_at: string | null
          id: string
          proof_url: string | null
          reviewed_at: string | null
          status: string
          user_id: string
          wave_phone: string
        }
        Insert: {
          admin_note?: string
          amount: number
          created_at?: string
          credited_at?: string | null
          id?: string
          proof_url?: string | null
          reviewed_at?: string | null
          status?: string
          user_id: string
          wave_phone?: string
        }
        Update: {
          admin_note?: string
          amount?: number
          created_at?: string
          credited_at?: string | null
          id?: string
          proof_url?: string | null
          reviewed_at?: string | null
          status?: string
          user_id?: string
          wave_phone?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          active: boolean
          created_at: string
          daily_income: number
          days: number
          days_claimed: number
          id: string
          last_claim_at: string
          plan_id: number
          price: number
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          daily_income: number
          days: number
          days_claimed?: number
          id?: string
          last_claim_at?: string
          plan_id: number
          price: number
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          daily_income?: number
          days?: number
          days_claimed?: number
          id?: string
          last_claim_at?: string
          plan_id?: number
          price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "vip_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          balance: number
          blocked: boolean
          created_at: string
          full_name: string
          has_deposited: boolean
          id: string
          invite_code: string
          phone: string
          referred_by: string | null
          user_id: string
          withdraw_no_referral: boolean
          withdraw_unlocked: boolean
        }
        Insert: {
          balance?: number
          blocked?: boolean
          created_at?: string
          full_name?: string
          has_deposited?: boolean
          id?: string
          invite_code: string
          phone?: string
          referred_by?: string | null
          user_id: string
          withdraw_no_referral?: boolean
          withdraw_unlocked?: boolean
        }
        Update: {
          balance?: number
          blocked?: boolean
          created_at?: string
          full_name?: string
          has_deposited?: boolean
          id?: string
          invite_code?: string
          phone?: string
          referred_by?: string | null
          user_id?: string
          withdraw_no_referral?: boolean
          withdraw_unlocked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scratch_cards: {
        Row: {
          amount: number
          created_at: string
          id: string
          prize: string | null
          scratched_at: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          prize?: string | null
          scratched_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          prize?: string | null
          scratched_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vip_plans: {
        Row: {
          created_at: string
          daily_income: number
          days: number
          id: number
          name: string
          price: number
          tier: string
        }
        Insert: {
          created_at?: string
          daily_income: number
          days?: number
          id: number
          name: string
          price: number
          tier: string
        }
        Update: {
          created_at?: string
          daily_income?: number
          days?: number
          id?: number
          name?: string
          price?: number
          tier?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          amount: number
          created_at: string
          id: string
          status: string
          user_id: string
          wave_number: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          status?: string
          user_id: string
          wave_number: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          status?: string
          user_id?: string
          wave_number?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_audit_list: {
        Args: { p_code: string; p_email: string }
        Returns: {
          action: string
          admin_email: string
          amount: number
          created_at: string
          deposit_id: string | null
          id: string
          note: string
          target_email: string
          target_name: string
          target_profile_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "admin_audit"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      admin_deposits: {
        Args: { p_code: string; p_email: string }
        Returns: {
          admin_note: string
          amount: number
          balance: number
          blocked: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          invite_code: string
          phone: string
          profile_id: string
          proof_url: string
          reviewed_at: string
          sponsor_code: string
          status: string
          wave_phone: string
        }[]
      }
      admin_gate: {
        Args: { p_code: string; p_email: string }
        Returns: boolean
      }
      admin_members: {
        Args: { p_code: string; p_email: string }
        Returns: {
          active_referrals: number
          balance: number
          blocked: boolean
          created_at: string
          email: string
          full_name: string
          has_deposited: boolean
          invite_code: string
          phone: string
          profile_id: string
          referrals: number
          sponsor_code: string
        }[]
      }
      admin_review_deposit: {
        Args: {
          p_action: string
          p_code: string
          p_email: string
          p_id: string
          p_note?: string
        }
        Returns: undefined
      }
      admin_set_blocked: {
        Args: {
          p_blocked: boolean
          p_code: string
          p_email: string
          p_profile_id: string
        }
        Returns: undefined
      }
      admin_stats: { Args: { p_code: string; p_email: string }; Returns: Json }
      buy_vip: {
        Args: { p_plan_id: number }
        Returns: {
          active: boolean
          created_at: string
          daily_income: number
          days: number
          days_claimed: number
          id: string
          last_claim_at: string
          plan_id: number
          price: number
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "investments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_withdraw: { Args: never; Returns: boolean }
      claim_vip_income: { Args: never; Returns: number }
      ensure_profile: {
        Args: { p_name: string; p_phone: string; p_ref_code: string }
        Returns: {
          balance: number
          blocked: boolean
          created_at: string
          full_name: string
          has_deposited: boolean
          id: string
          invite_code: string
          phone: string
          referred_by: string | null
          user_id: string
          withdraw_no_referral: boolean
          withdraw_unlocked: boolean
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      my_referrals: {
        Args: never
        Returns: {
          created_at: string
          full_name: string
          has_deposited: boolean
        }[]
      }
      my_scratch_card: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          id: string
          prize: string | null
          scratched_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "scratch_cards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      process_my_deposits: { Args: never; Returns: undefined }
      referrer_name: { Args: { p_code: string }; Returns: string }
      request_withdrawal: {
        Args: { p_amount: number; p_number: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          status: string
          user_id: string
          wave_number: string
        }
        SetofOptions: {
          from: "*"
          to: "withdrawals"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      scratch_card: {
        Args: { p_id: string }
        Returns: {
          amount: number
          created_at: string
          id: string
          prize: string | null
          scratched_at: string | null
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "scratch_cards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_deposit: {
        Args: { p_amount: number }
        Returns: {
          admin_note: string
          amount: number
          created_at: string
          credited_at: string | null
          id: string
          proof_url: string | null
          reviewed_at: string | null
          status: string
          user_id: string
          wave_phone: string
        }
        SetofOptions: {
          from: "*"
          to: "deposits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_deposit_proof: {
        Args: { p_amount: number; p_phone: string; p_proof_url: string }
        Returns: {
          admin_note: string
          amount: number
          created_at: string
          credited_at: string | null
          id: string
          proof_url: string | null
          reviewed_at: string | null
          status: string
          user_id: string
          wave_phone: string
        }
        SetofOptions: {
          from: "*"
          to: "deposits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      withdraw_status: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
