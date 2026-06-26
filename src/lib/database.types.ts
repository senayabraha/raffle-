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
      admin_actions: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          meta: Json
          reason: string | null
          target_id: string
          target_table: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          target_id: string
          target_table: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          meta?: Json
          reason?: string | null
          target_id?: string
          target_table?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      featured_raffles: {
        Row: {
          created_at: string
          display_order: number
          id: string
          raffle_id: string
        }
        Insert: {
          created_at?: string
          display_order: number
          id?: string
          raffle_id: string
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          raffle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "featured_raffles_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: true
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_settings: {
        Row: {
          id: number
          rotation_interval_ms: number
          transition_direction: string
        }
        Insert: {
          id?: number
          rotation_interval_ms?: number
          transition_direction?: string
        }
        Update: {
          id?: number
          rotation_interval_ms?: number
          transition_direction?: string
        }
        Relationships: []
      }
      hero_slides: {
        Row: {
          created_at: string
          headline: string | null
          id: string
          image_zoom: number | null
          is_active: boolean
          media_type: string | null
          media_url: string | null
          order: number
          sub_copy: string | null
        }
        Insert: {
          created_at?: string
          headline?: string | null
          id?: string
          image_zoom?: number | null
          is_active?: boolean
          media_type?: string | null
          media_url?: string | null
          order: number
          sub_copy?: string | null
        }
        Update: {
          created_at?: string
          headline?: string | null
          id?: string
          image_zoom?: number | null
          is_active?: boolean
          media_type?: string | null
          media_url?: string | null
          order?: number
          sub_copy?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          raffle_id: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          raffle_id?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          raffle_id?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_gross: number | null
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
          amount_gross?: number | null
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
          amount_gross?: number | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          last_active_mode: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
          stripe_customer_id: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          suspension_ends_at: string | null
          suspension_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          last_active_mode?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          stripe_customer_id?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          suspension_ends_at?: string | null
          suspension_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          last_active_mode?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          stripe_customer_id?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          suspension_ends_at?: string | null
          suspension_type?: string | null
        }
        Relationships: []
      }
      raffles: {
        Row: {
          bundle_rules: Json
          category: string | null
          condition: Database["public"]["Enums"]["prize_condition"] | null
          created_at: string
          delivery_method: Database["public"]["Enums"]["delivery_method"] | null
          description: string | null
          draw_date: string | null
          draw_type: Database["public"]["Enums"]["draw_type"]
          host_id: string
          id: string
          image_urls: string[]
          min_ticket_target: number | null
          prize_confirmed_at: string | null
          prize_status: Database["public"]["Enums"]["prize_status"]
          prize_value: number | null
          slug: string
          status: Database["public"]["Enums"]["raffle_status"]
          draw_date_extended_at: string | null
          suspended_at: string | null
          suspended_until: string | null
          suspension_status: string
          ticket_cap: number | null
          ticket_price: number
          tickets_sold_count: number
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          bundle_rules?: Json
          category?: string | null
          condition?: Database["public"]["Enums"]["prize_condition"] | null
          created_at?: string
          delivery_method?: Database["public"]["Enums"]["delivery_method"] | null
          description?: string | null
          draw_date?: string | null
          draw_type?: Database["public"]["Enums"]["draw_type"]
          host_id: string
          id?: string
          image_urls?: string[]
          min_ticket_target?: number | null
          prize_confirmed_at?: string | null
          prize_status?: Database["public"]["Enums"]["prize_status"]
          prize_value?: number | null
          slug: string
          status?: Database["public"]["Enums"]["raffle_status"]
          draw_date_extended_at?: string | null
          suspended_at?: string | null
          suspended_until?: string | null
          suspension_status?: string
          ticket_cap?: number | null
          ticket_price?: number
          tickets_sold_count?: number
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          bundle_rules?: Json
          category?: string | null
          condition?: Database["public"]["Enums"]["prize_condition"] | null
          created_at?: string
          delivery_method?: Database["public"]["Enums"]["delivery_method"] | null
          description?: string | null
          draw_date?: string | null
          draw_type?: Database["public"]["Enums"]["draw_type"]
          host_id?: string
          id?: string
          image_urls?: string[]
          min_ticket_target?: number | null
          prize_confirmed_at?: string | null
          prize_status?: Database["public"]["Enums"]["prize_status"]
          prize_value?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["raffle_status"]
          draw_date_extended_at?: string | null
          suspended_at?: string | null
          suspended_until?: string | null
          suspension_status?: string
          ticket_cap?: number | null
          ticket_price?: number
          tickets_sold_count?: number
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
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
          created_at: string
          entrant_id: string | null
          entry_type: Database["public"]["Enums"]["entry_type"]
          geo_region: string | null
          id: string
          payment_id: string | null
          raffle_id: string
          ticket_number: number
        }
        Insert: {
          created_at?: string
          entrant_id?: string | null
          entry_type?: Database["public"]["Enums"]["entry_type"]
          geo_region?: string | null
          id?: string
          payment_id?: string | null
          raffle_id: string
          ticket_number: number
        }
        Update: {
          created_at?: string
          entrant_id?: string | null
          entry_type?: Database["public"]["Enums"]["entry_type"]
          geo_region?: string | null
          id?: string
          payment_id?: string | null
          raffle_id?: string
          ticket_number?: number
        }
        Relationships: [
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
      admin_export_user_data: {
        Args: { p_user_id: string }
        Returns: Json
      }
      admin_resolve_dispute: {
        Args: { p_decision: string; p_reason: string; p_winner_id: string }
        Returns: Json
      }
      admin_set_raffle_status: {
        Args: { p_raffle_id: string; p_reason: string; p_status: string }
        Returns: Json
      }
      admin_set_subscription_tier: {
        Args: { p_reason: string; p_tier: string; p_user_id: string }
        Returns: Json
      }
      admin_set_user_role: {
        Args: { p_reason: string; p_role: string; p_user_id: string }
        Returns: Json
      }
      admin_set_user_status: {
        Args: { p_reason: string; p_status: string; p_user_id: string }
        Returns: Json
      }
      admin_suspend_raffle: {
        Args: {
          p_raffle_id: string
          p_reason: string
          p_type: string
          p_until?: string | null
        }
        Returns: Json
      }
      admin_unsuspend_raffle: {
        Args: { p_raffle_id: string; p_reason: string }
        Returns: Json
      }
      admin_extend_raffle_draw: {
        Args: { p_new_draw_date: string; p_raffle_id: string; p_reason: string }
        Returns: Json
      }
      admin_suspend_user: {
        Args: {
          p_ends_at?: string | null
          p_reason: string
          p_type: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_unsuspend_user: {
        Args: { p_reason: string; p_user_id: string }
        Returns: Json
      }
      cancel_raffle: {
        Args: { p_raffle_id: string }
        Returns: Json
      }
      confirm_prize: {
        Args: { p_decision: string; p_raffle_id: string }
        Returns: Json
      }
      update_raffle_details: {
        Args: {
          p_description: string | null
          p_image_urls: string[]
          p_prize_value: number | null
          p_raffle_id: string
          p_ticket_cap: number | null
          p_ticket_price: number
        }
        Returns: Json
      }
      create_pending_checkout: {
        Args: {
          p_city?: string
          p_email?: string
          p_full_name?: string
          p_phone?: string
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
        Args: { p_qty: number; p_raffle_id: string }
        Returns: Json
      }
      request_host_access: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      respond_to_win: {
        Args: { p_decision: string; p_winner_id: string }
        Returns: Json
      }
    }
    Enums: {
      delivery_method: "shipping" | "pickup" | "digital" | "cash_equivalent"
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
      prize_condition: "new" | "used" | "refurbished"
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
      delivery_method: ["shipping", "pickup", "digital", "cash_equivalent"],
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
      prize_condition: ["new", "used", "refurbished"],
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
