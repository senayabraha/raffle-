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
      affiliates: {
        Row: {
          affiliate_id: string
          commission_earned: number
          created_at: string
          id: string
          raffle_id: string
          tickets_sold: number
          unique_link: string
        }
        Insert: {
          affiliate_id: string
          commission_earned?: number
          created_at?: string
          id?: string
          raffle_id: string
          tickets_sold?: number
          unique_link: string
        }
        Update: {
          affiliate_id?: string
          commission_earned?: number
          created_at?: string
          id?: string
          raffle_id?: string
          tickets_sold?: number
          unique_link?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliates_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          body_html: string | null
          created_at: string
          host_id: string
          id: string
          raffle_id: string | null
          recipient_count: number
          sent_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          subject: string | null
        }
        Insert: {
          body_html?: string | null
          created_at?: string
          host_id: string
          id?: string
          raffle_id?: string | null
          recipient_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string | null
        }
        Update: {
          body_html?: string | null
          created_at?: string
          host_id?: string
          id?: string
          raffle_id?: string | null
          recipient_count?: number
          sent_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      charities: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          registration_number: string | null
          verified: boolean
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          registration_number?: string | null
          verified?: boolean
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          registration_number?: string | null
          verified?: boolean
        }
        Relationships: []
      }
      checkout_contacts: {
        Row: {
          city: string
          created_at: string
          email: string
          full_name: string
          payment_id: string
          phone: string
        }
        Insert: {
          city: string
          created_at?: string
          email: string
          full_name: string
          payment_id: string
          phone: string
        }
        Update: {
          city?: string
          created_at?: string
          email?: string
          full_name?: string
          payment_id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkout_contacts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      draw_audit: {
        Row: {
          created_at: string
          drawn_index: number | null
          drawn_ticket_number: number | null
          entries: number
          id: string
          method: string
          raffle_id: string
          seed: string
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          drawn_index?: number | null
          drawn_ticket_number?: number | null
          entries: number
          id?: string
          method?: string
          raffle_id: string
          seed: string
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          drawn_index?: number | null
          drawn_ticket_number?: number | null
          entries?: number
          id?: string
          method?: string
          raffle_id?: string
          seed?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draw_audit_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "draw_audit_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          affiliate_share: number
          amount_gross: number | null
          charity_share: number
          created_at: string
          host_net: number
          id: string
          meta: Json
          payer_id: string | null
          platform_commission: number
          provider: Database["public"]["Enums"]["payment_provider"] | null
          provider_ref: string | null
          raffle_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id: string | null
        }
        Insert: {
          affiliate_share?: number
          amount_gross?: number | null
          charity_share?: number
          created_at?: string
          host_net?: number
          id?: string
          meta?: Json
          payer_id?: string | null
          platform_commission?: number
          provider?: Database["public"]["Enums"]["payment_provider"] | null
          provider_ref?: string | null
          raffle_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id?: string | null
        }
        Update: {
          affiliate_share?: number
          amount_gross?: number | null
          charity_share?: number
          created_at?: string
          host_net?: number
          id?: string
          meta?: Json
          payer_id?: string | null
          platform_commission?: number
          provider?: Database["public"]["Enums"]["payment_provider"] | null
          provider_ref?: string | null
          raffle_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          host_id: string | null
          id: string
          raffle_id: string | null
          status: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id: string | null
          type: Database["public"]["Enums"]["payout_type"]
        }
        Insert: {
          amount: number
          created_at?: string
          host_id?: string | null
          id?: string
          raffle_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id?: string | null
          type: Database["public"]["Enums"]["payout_type"]
        }
        Update: {
          amount?: number
          created_at?: string
          host_id?: string | null
          id?: string
          raffle_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"]
          stripe_transfer_id?: string | null
          type?: Database["public"]["Enums"]["payout_type"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          stripe_account_id: string | null
          stripe_customer_id: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          trustpilot_score: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trustpilot_score?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          stripe_account_id?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          trustpilot_score?: number | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          raffle_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          raffle_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          raffle_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      raffles: {
        Row: {
          affiliate_percent: number
          bundle_rules: Json
          category: string | null
          charity_id: string | null
          charity_percent: number
          created_at: string
          description: string | null
          draw_date: string | null
          draw_type: Database["public"]["Enums"]["draw_type"]
          featured_until: string | null
          host_id: string
          id: string
          image_url: string | null
          min_ticket_target: number | null
          prize_confirmed_at: string | null
          prize_status: Database["public"]["Enums"]["prize_status"]
          revenue_released_at: string | null
          slug: string
          status: Database["public"]["Enums"]["raffle_status"]
          ticket_cap: number | null
          ticket_price: number
          tickets_sold_count: number
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          affiliate_percent?: number
          bundle_rules?: Json
          category?: string | null
          charity_id?: string | null
          charity_percent?: number
          created_at?: string
          description?: string | null
          draw_date?: string | null
          draw_type?: Database["public"]["Enums"]["draw_type"]
          featured_until?: string | null
          host_id: string
          id?: string
          image_url?: string | null
          min_ticket_target?: number | null
          prize_confirmed_at?: string | null
          prize_status?: Database["public"]["Enums"]["prize_status"]
          revenue_released_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["raffle_status"]
          ticket_cap?: number | null
          ticket_price?: number
          tickets_sold_count?: number
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          affiliate_percent?: number
          bundle_rules?: Json
          category?: string | null
          charity_id?: string | null
          charity_percent?: number
          created_at?: string
          description?: string | null
          draw_date?: string | null
          draw_type?: Database["public"]["Enums"]["draw_type"]
          featured_until?: string | null
          host_id?: string
          id?: string
          image_url?: string | null
          min_ticket_target?: number | null
          prize_confirmed_at?: string | null
          prize_status?: Database["public"]["Enums"]["prize_status"]
          revenue_released_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["raffle_status"]
          ticket_cap?: number | null
          ticket_price?: number
          tickets_sold_count?: number
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "raffles_charity_id_fkey"
            columns: ["charity_id"]
            isOneToOne: false
            referencedRelation: "charities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "raffles_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          affiliate_id: string | null
          created_at: string
          entrant_id: string | null
          entry_type: Database["public"]["Enums"]["entry_type"]
          geo_region: string | null
          id: string
          payment_id: string | null
          promo_code_id: string | null
          raffle_id: string
          ticket_number: number
        }
        Insert: {
          affiliate_id?: string | null
          created_at?: string
          entrant_id?: string | null
          entry_type?: Database["public"]["Enums"]["entry_type"]
          geo_region?: string | null
          id?: string
          payment_id?: string | null
          promo_code_id?: string | null
          raffle_id: string
          ticket_number: number
        }
        Update: {
          affiliate_id?: string | null
          created_at?: string
          entrant_id?: string | null
          entry_type?: Database["public"]["Enums"]["entry_type"]
          geo_region?: string | null
          id?: string
          payment_id?: string | null
          promo_code_id?: string | null
          raffle_id?: string
          ticket_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tickets_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_entrant_id_fkey"
            columns: ["entrant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      winners: {
        Row: {
          accepted_at: string | null
          claim_deadline: string | null
          created_at: string
          disputed_at: string | null
          id: string
          notified_at: string | null
          prize_status: Database["public"]["Enums"]["winner_prize_status"]
          raffle_id: string
          ticket_id: string | null
          winner_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          claim_deadline?: string | null
          created_at?: string
          disputed_at?: string | null
          id?: string
          notified_at?: string | null
          prize_status?: Database["public"]["Enums"]["winner_prize_status"]
          raffle_id: string
          ticket_id?: string | null
          winner_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          claim_deadline?: string | null
          created_at?: string
          disputed_at?: string | null
          id?: string
          notified_at?: string | null
          prize_status?: Database["public"]["Enums"]["winner_prize_status"]
          raffle_id?: string
          ticket_id?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "winners_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "winners_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_prize: {
        Args: { p_decision: string; p_raffle_id: string }
        Returns: Json
      }
      create_pending_checkout: {
        Args: {
          p_city?: string
          p_email?: string
          p_full_name?: string
          p_phone?: string
          p_promo?: string
          p_provider?: Database["public"]["Enums"]["payment_provider"]
          p_qty: number
          p_raffle_id: string
        }
        Returns: Json
      }
      finalize_checkout: {
        Args: { p_payment_id: string; p_provider_ref: string }
        Returns: Json
      }
      get_checkout_status: { Args: { p_payment_id: string }; Returns: Json }
      purchase_tickets: {
        Args: { p_promo?: string; p_qty: number; p_raffle_id: string }
        Returns: Json
      }
      withdraw_revenue: { Args: { p_raffle_id: string }; Returns: Json }
    }
    Enums: {
      campaign_status: "draft" | "sent" | "scheduled"
      discount_type: "percent" | "fixed" | "free_tickets"
      draw_type: "date" | "soldout" | "hybrid"
      entry_type: "paid" | "free_share" | "free_bonus" | "affiliate"
      payment_provider: "chapa" | "telebirr"
      payment_status:
        | "pending"
        | "held"
        | "released"
        | "refunded"
        | "compensated"
        | "failed"
      payout_status: "pending" | "processed" | "failed"
      payout_type:
        | "host_revenue"
        | "charity"
        | "affiliate"
        | "winner_compensation"
      prize_status: "pending" | "confirmed" | "revoked" | "disputed"
      raffle_status: "draft" | "live" | "ended" | "cancelled"
      subscription_tier: "basic" | "premium" | "pro"
      user_role: "host" | "entrant" | "both" | "admin"
      visibility: "public" | "private"
      winner_prize_status:
        | "awaiting_claim"
        | "claimed"
        | "accepted"
        | "disputed"
        | "compensated"
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
    Enums: {
      campaign_status: ["draft", "sent", "scheduled"],
      discount_type: ["percent", "fixed", "free_tickets"],
      draw_type: ["date", "soldout", "hybrid"],
      entry_type: ["paid", "free_share", "free_bonus", "affiliate"],
      payment_provider: ["chapa", "telebirr"],
      payment_status: [
        "pending",
        "held",
        "released",
        "refunded",
        "compensated",
        "failed",
      ],
      payout_status: ["pending", "processed", "failed"],
      payout_type: [
        "host_revenue",
        "charity",
        "affiliate",
        "winner_compensation",
      ],
      prize_status: ["pending", "confirmed", "revoked", "disputed"],
      raffle_status: ["draft", "live", "ended", "cancelled"],
      subscription_tier: ["basic", "premium", "pro"],
      user_role: ["host", "entrant", "both", "admin"],
      visibility: ["public", "private"],
      winner_prize_status: [
        "awaiting_claim",
        "claimed",
        "accepted",
        "disputed",
        "compensated",
      ],
    },
  },
} as const
