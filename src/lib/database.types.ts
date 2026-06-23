export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
        Relationships: []
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
        Relationships: []
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
      payments: {
        Row: {
          affiliate_share: number
          amount_gross: number
          charity_share: number
          created_at: string
          host_net: number
          id: string
          payer_id: string | null
          platform_commission: number
          raffle_id: string
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id: string | null
        }
        Insert: {
          affiliate_share?: number
          amount_gross: number
          charity_share?: number
          created_at?: string
          host_net?: number
          id?: string
          payer_id?: string | null
          platform_commission?: number
          raffle_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id?: string | null
        }
        Update: {
          affiliate_share?: number
          amount_gross?: number
          charity_share?: number
          created_at?: string
          host_net?: number
          id?: string
          payer_id?: string | null
          platform_commission?: number
          raffle_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_id?: string | null
        }
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
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
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      campaign_status: "draft" | "sent" | "scheduled"
      discount_type: "percent" | "fixed" | "free_tickets"
      draw_type: "date" | "soldout" | "hybrid"
      entry_type: "paid" | "free_share" | "free_bonus" | "affiliate"
      payment_status: "held" | "released" | "refunded" | "compensated"
      payout_status: "pending" | "processed" | "failed"
      payout_type: "host_revenue" | "charity" | "affiliate" | "winner_compensation"
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
    CompositeTypes: { [_ in never]: never }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> =
  PublicSchema["Enums"][T]
