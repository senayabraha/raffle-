import { supabase } from "./supabase";

const MAX_FEATURED = 12;

export interface FeaturedRaffleCard {
  id: string;
  raffle_id: string;
  title: string;
  prize_image_url: string | null;
  ticket_price: number;
  tickets_sold: number;
  total_tickets: number | null;
  draw_date: string | null;
  slug: string;
}

export interface AdminFeaturedRaffle {
  id: string;
  raffle_id: string;
  display_order: number;
  title: string;
  prize_image_url: string | null;
}

/** A card in the effective homepage feed, tagged by where it came from. */
export interface FeaturedFeedCard extends FeaturedRaffleCard {
  source: "curated" | "auto";
}

export interface RaffleSearchResult {
  id: string;
  title: string;
}

export interface FeaturedSettings {
  cards_per_screen_mobile: number;
  cards_per_screen_desktop: number;
  scroll_duration_seconds: number;
}

type RaffleJoinRow = {
  id: string;
  title: string;
  image_urls: string[] | null;
  ticket_price: number;
  tickets_sold_count: number;
  ticket_cap: number | null;
  draw_date: string | null;
  slug: string;
  status: string;
};

type FeaturedJoinRow = {
  id: string;
  raffle_id: string;
  display_order: number;
  raffles: RaffleJoinRow;
};

function toCard(id: string, raffle: RaffleJoinRow): FeaturedRaffleCard {
  return {
    id,
    raffle_id: raffle.id,
    title: raffle.title,
    prize_image_url: raffle.image_urls?.[0] ?? null,
    ticket_price: raffle.ticket_price,
    tickets_sold: raffle.tickets_sold_count,
    total_tickets: raffle.ticket_cap,
    draw_date: raffle.draw_date,
    slug: raffle.slug,
  };
}

/**
 * Builds the effective homepage carousel feed: admin-curated featured
 * raffles in display order, topped up with the most popular live raffles
 * until there are 12. Each card is tagged with where it came from so the
 * admin panel can show curated vs. auto-filled entries separately.
 */
async function buildFeaturedFeed(): Promise<FeaturedFeedCard[]> {
  const { data: featuredRows, error: featuredError } = await supabase
    .from("featured_raffles")
    .select(
      "id, raffle_id, display_order, raffles!inner(id, title, image_urls, ticket_price, tickets_sold_count, ticket_cap, draw_date, slug, status)",
    )
    .eq("raffles.status", "live")
    .eq("raffles.suspension_status", "active")
    .order("display_order", { ascending: true });
  if (featuredError) throw featuredError;

  const curated = (featuredRows ?? []) as unknown as FeaturedJoinRow[];
  const cards: FeaturedFeedCard[] = curated.map((row) => ({ ...toCard(row.id, row.raffles), source: "curated" }));

  const remaining = MAX_FEATURED - cards.length;
  if (remaining > 0) {
    const usedRaffleIds = curated.map((row) => row.raffle_id);
    let query = supabase
      .from("raffles")
      .select("id, title, image_urls, ticket_price, tickets_sold_count, ticket_cap, draw_date, slug, status")
      .eq("status", "live")
      .eq("suspension_status", "active")
      .order("tickets_sold_count", { ascending: false })
      .limit(remaining);
    if (usedRaffleIds.length > 0) {
      query = query.not("id", "in", `(${usedRaffleIds.join(",")})`);
    }
    const { data: popularRows, error: popularError } = await query;
    if (popularError) throw popularError;

    const popular = (popularRows ?? []) as unknown as RaffleJoinRow[];
    cards.push(...popular.map((raffle) => ({ ...toCard(raffle.id, raffle), source: "auto" as const })));
  }

  return cards.slice(0, MAX_FEATURED);
}

/** Public homepage carousel feed. */
export async function getFeaturedRaffles(): Promise<FeaturedRaffleCard[]> {
  return buildFeaturedFeed();
}

/** Admin: the effective homepage feed, tagged curated vs. auto-filled, for the preview/list. */
export async function getAdminFeaturedFeed(): Promise<FeaturedFeedCard[]> {
  return buildFeaturedFeed();
}

/** Admin: every currently featured raffle, in display order. */
export async function getAdminFeaturedRaffles(): Promise<AdminFeaturedRaffle[]> {
  const { data, error } = await supabase
    .from("featured_raffles")
    .select("id, raffle_id, display_order, raffles(id, title, image_urls)")
    .order("display_order", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as {
    id: string;
    raffle_id: string;
    display_order: number;
    raffles: { id: string; title: string; image_urls: string[] | null };
  }[];

  return rows.map((row) => ({
    id: row.id,
    raffle_id: row.raffle_id,
    display_order: row.display_order,
    title: row.raffles.title,
    prize_image_url: row.raffles.image_urls?.[0] ?? null,
  }));
}

/**
 * Admin: live raffles for the "add featured" picker. With no query, lists
 * the most recently created live raffles so admins can browse without
 * already knowing a title to search for; with a query, filters by title.
 */
export async function searchRaffles(query: string): Promise<RaffleSearchResult[]> {
  const trimmed = query.trim();

  let request = supabase
    .from("raffles")
    .select("id, title")
    .eq("status", "live")
    .eq("suspension_status", "active");
  if (trimmed) request = request.ilike("title", `%${trimmed}%`);

  const { data, error } = await request
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data ?? [];
}

/** Admin: features a raffle at the given display order. Caps the deck at 12. */
export async function addFeaturedRaffle(raffleId: string, order: number): Promise<void> {
  const { count, error: countError } = await supabase
    .from("featured_raffles")
    .select("id", { count: "exact", head: true });
  if (countError) throw countError;
  if ((count ?? 0) >= MAX_FEATURED) {
    throw new Error(`Maximum of ${MAX_FEATURED} featured raffles reached.`);
  }

  const { error } = await supabase
    .from("featured_raffles")
    .insert({ raffle_id: raffleId, display_order: order });
  if (error) throw error;
}

/** Admin: unfeatures a raffle by its featured_raffles row id. */
export async function removeFeaturedRaffle(id: string): Promise<void> {
  const { error } = await supabase.from("featured_raffles").delete().eq("id", id);
  if (error) throw error;
}

/** Admin: persists a new featured order. `orderedIds` is the full list, top to bottom. */
export async function reorderFeaturedRaffles(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from("featured_raffles").update({ display_order: index + 1 }).eq("id", id),
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;
}

/** Public: how many featured cards should be visible at once, per breakpoint. */
export async function getFeaturedSettings(): Promise<FeaturedSettings> {
  const { data, error } = await supabase
    .from("featured_settings")
    .select("cards_per_screen_mobile, cards_per_screen_desktop, scroll_duration_seconds")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data;
}

/** Admin: updates the cards-per-screen display settings. */
export async function updateFeaturedSettings(data: Partial<FeaturedSettings>): Promise<void> {
  const { error } = await supabase.from("featured_settings").update(data).eq("id", 1);
  if (error) throw error;
}
