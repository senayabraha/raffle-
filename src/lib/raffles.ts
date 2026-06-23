import { Car, Plane, Gamepad2, Watch, Home, Banknote, Camera, Gift, type LucideIcon } from "lucide-react";
import { supabase } from "./supabase";
import type { RaffleDraft } from "@/components/wizard/types";
import type { MarketplaceRaffle } from "@/data/marketplace";

/** Visual styling applied to a DB raffle based on its category. */
const categoryStyle: Record<string, { icon: LucideIcon; gradient: string }> = {
  Automotive: { icon: Car, gradient: "from-rose-500/30 via-accent/20 to-indigo-600/30" },
  Travel: { icon: Plane, gradient: "from-cyan-400/30 via-sky-500/20 to-blue-600/30" },
  Tech: { icon: Gamepad2, gradient: "from-emerald-400/30 via-teal-500/20 to-cyan-600/30" },
  Luxury: { icon: Watch, gradient: "from-amber-400/30 via-yellow-500/20 to-orange-600/30" },
  Property: { icon: Home, gradient: "from-fuchsia-500/30 via-accent/20 to-violet-700/30" },
  Cash: { icon: Banknote, gradient: "from-fuchsia-500/30 via-accent/20 to-violet-700/30" },
  Experiences: { icon: Camera, gradient: "from-red-500/30 via-rose-500/20 to-pink-600/30" },
};

const fallbackStyle = { icon: Gift, gradient: "from-fuchsia-500/30 via-accent/20 to-indigo-600/30" };

function slugify(title: string) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base || "raffle"}-${suffix}`;
}

type Bundle = { qty: number; free: number };

function parseBundles(raw: unknown): Bundle[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((b) => {
      const o = b as Record<string, unknown>;
      const qty = Number(o.buy ?? o.qty);
      const free = Number(o.free);
      return Number.isFinite(qty) && Number.isFinite(free) ? { qty, free } : null;
    })
    .filter((b): b is Bundle => b !== null);
}

type RaffleRowWithHost = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  category: string | null;
  visibility: "public" | "private";
  status: "draft" | "live" | "ended" | "cancelled";
  ticket_price: number;
  ticket_cap: number | null;
  tickets_sold_count: number;
  bundle_rules: unknown;
  draw_date: string | null;
  charity_percent: number;
  featured_until: string | null;
  host: { full_name: string | null } | { full_name: string | null }[] | null;
};

/** Maps a DB raffle row (with joined host) into the marketplace card shape. */
export function mapRaffleRow(row: RaffleRowWithHost): MarketplaceRaffle {
  const style = (row.category && categoryStyle[row.category]) || fallbackStyle;
  const hostObj = Array.isArray(row.host) ? row.host[0] : row.host;
  const hostName = hostObj?.full_name?.trim() || "A Raffall host";
  const initials = hostName
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? "",
    category: row.category ?? "Other",
    hostType: "individual",
    icon: style.icon,
    gradient: style.gradient,
    host: hostName,
    hostInitials: initials || "RH",
    rating: 5.0,
    status: row.status === "ended" ? "ended" : "live",
    ticketPrice: Number(row.ticket_price),
    sold: row.tickets_sold_count,
    cap: row.ticket_cap ?? Math.max(row.tickets_sold_count * 2, 1000),
    drawDate:
      row.draw_date ??
      new Date(Date.now() + 7 * 86_400_000).toISOString(),
    featured: row.featured_until ? new Date(row.featured_until) > new Date() : false,
    charityPercent: Number(row.charity_percent),
    bundles: parseBundles(row.bundle_rules),
  };
}

const HOST_SELECT = "*, host:profiles!raffles_host_id_fkey(full_name)";

/** Fetches live, public raffles for the marketplace. */
export async function fetchPublicRaffles(): Promise<MarketplaceRaffle[]> {
  const { data, error } = await supabase
    .from("raffles")
    .select(HOST_SELECT)
    .eq("visibility", "public")
    .eq("status", "live")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as RaffleRowWithHost[]).map(mapRaffleRow);
}

/** Fetches a single raffle by slug for the listing page. */
export async function fetchRaffleBySlug(
  slug: string,
): Promise<MarketplaceRaffle | null> {
  const { data, error } = await supabase
    .from("raffles")
    .select(HOST_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) return null;
  return mapRaffleRow(data as unknown as RaffleRowWithHost);
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** True when a raffle id is a real database row (vs. a demo/mock raffle). */
export function isDbRaffle(id: string) {
  return UUID_RE.test(id);
}

export interface PurchaseResult {
  payment_id: string;
  paid: number;
  free: number;
  total: number;
  amount: number;
  first_ticket: number;
  last_ticket: number;
}

/** Buys tickets for a raffle via the atomic purchase_tickets RPC. */
export async function purchaseTickets(
  raffleId: string,
  qty: number,
  promo?: string,
): Promise<PurchaseResult> {
  const { data, error } = await supabase.rpc("purchase_tickets", {
    p_raffle_id: raffleId,
    p_qty: qty,
    p_promo: promo && promo.trim() ? promo.trim() : null,
  });
  if (error) throw error;
  return data as unknown as PurchaseResult;
}

export interface MyTicketGroup {
  raffleId: string;
  slug: string;
  title: string;
  category: string;
  status: "live" | "ended" | "draw_pending";
  drawDate: string | null;
  ticketPrice: number;
  count: number;
  freeCount: number;
  numbers: number[];
}

/** Returns the signed-in entrant's tickets grouped by raffle. */
export async function fetchMyTickets(userId: string): Promise<MyTicketGroup[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(
      "ticket_number, entry_type, raffle:raffles!tickets_raffle_id_fkey(id, slug, title, category, status, draw_date, ticket_price)",
    )
    .eq("entrant_id", userId)
    .order("ticket_number", { ascending: true });

  if (error || !data) return [];

  const groups = new Map<string, MyTicketGroup>();
  for (const row of data as unknown as Array<{
    ticket_number: number;
    entry_type: string;
    raffle: {
      id: string;
      slug: string;
      title: string;
      category: string | null;
      status: string;
      draw_date: string | null;
      ticket_price: number;
    } | null;
  }>) {
    const r = row.raffle;
    if (!r) continue;
    let g = groups.get(r.id);
    if (!g) {
      g = {
        raffleId: r.id,
        slug: r.slug,
        title: r.title,
        category: r.category ?? "Other",
        status: r.status === "ended" ? "ended" : "live",
        drawDate: r.draw_date,
        ticketPrice: Number(r.ticket_price),
        count: 0,
        freeCount: 0,
        numbers: [],
      };
      groups.set(r.id, g);
    }
    g.count += 1;
    if (row.entry_type !== "paid") g.freeCount += 1;
    g.numbers.push(row.ticket_number);
  }
  return [...groups.values()];
}

export interface EndedRaffleDetail {
  id: string;
  title: string;
  drawnAt: string | null;
  sold: number;
  price: number;
  prizeStatus: "pending" | "confirmed" | "revoked" | "disputed";
  revenueReleased: boolean;
  gross: number;
  commission: number;
  hostNet: number;
  winner: {
    name: string;
    initials: string;
    ticket: number | null;
    email: string;
    region: string;
  } | null;
  audit: {
    method: string;
    seed: string;
    entries: number;
    drawnIndex: number | null;
    drawnTicket: number | null;
    timestamp: string;
  } | null;
}

function initialsFromName(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "??"
  );
}

/** Loads the host's most recent ended raffle with winner, audit and revenue. */
export async function fetchEndedRaffleForHost(
  hostId: string,
): Promise<EndedRaffleDetail | null> {
  const { data: raffle } = await supabase
    .from("raffles")
    .select(
      "id, title, draw_date, tickets_sold_count, ticket_price, prize_status, revenue_released_at",
    )
    .eq("host_id", hostId)
    .eq("status", "ended")
    .order("draw_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!raffle) return null;

  const [{ data: winnerRow }, { data: auditRow }, { data: payments }] =
    await Promise.all([
      supabase
        .from("winners")
        .select(
          "ticket:tickets!winners_ticket_id_fkey(ticket_number, geo_region), profile:profiles!winners_winner_id_fkey(full_name, email)",
        )
        .eq("raffle_id", raffle.id)
        .maybeSingle(),
      supabase
        .from("draw_audit")
        .select("method, seed, entries, drawn_index, drawn_ticket_number, created_at")
        .eq("raffle_id", raffle.id)
        .maybeSingle(),
      supabase
        .from("payments")
        .select("amount_gross, platform_commission, host_net")
        .eq("raffle_id", raffle.id),
    ]);

  const gross = (payments ?? []).reduce((s, p) => s + Number(p.amount_gross), 0);
  const commission = (payments ?? []).reduce(
    (s, p) => s + Number(p.platform_commission),
    0,
  );
  const hostNet = (payments ?? []).reduce((s, p) => s + Number(p.host_net), 0);

  const wr = winnerRow as
    | {
        ticket: { ticket_number: number; geo_region: string | null } | null;
        profile: { full_name: string | null; email: string | null } | null;
      }
    | null;

  const winnerName = wr?.profile?.full_name?.trim() || "Awaiting entrant";

  return {
    id: raffle.id,
    title: raffle.title,
    drawnAt: raffle.draw_date,
    sold: raffle.tickets_sold_count,
    price: Number(raffle.ticket_price),
    prizeStatus: raffle.prize_status,
    revenueReleased: raffle.revenue_released_at != null,
    gross,
    commission,
    hostNet,
    winner: wr
      ? {
          name: winnerName,
          initials: initialsFromName(winnerName),
          ticket: wr.ticket?.ticket_number ?? null,
          email: wr.profile?.email ?? "—",
          region: wr.ticket?.geo_region ?? "—",
        }
      : null,
    audit: auditRow
      ? {
          method: auditRow.method,
          seed: auditRow.seed,
          entries: auditRow.entries,
          drawnIndex: auditRow.drawn_index,
          drawnTicket: auditRow.drawn_ticket_number,
          timestamp: auditRow.created_at,
        }
      : null,
  };
}

export async function confirmPrize(raffleId: string, decision: string) {
  const { data, error } = await supabase.rpc("confirm_prize", {
    p_raffle_id: raffleId,
    p_decision: decision,
  });
  if (error) throw error;
  return data as unknown as { prize_status: string; compensation?: number };
}

export async function withdrawRevenue(raffleId: string) {
  const { data, error } = await supabase.rpc("withdraw_revenue", {
    p_raffle_id: raffleId,
  });
  if (error) throw error;
  return data as unknown as { amount: number };
}

/** Persists a wizard draft as a live raffle owned by the given host. */
export async function createRaffle(draft: RaffleDraft, hostId: string) {
  const slug = slugify(draft.title);
  const bundle_rules = draft.bundlesEnabled
    ? [{ buy: draft.bundleQty, free: draft.bundleFree }]
    : [];

  const { data, error } = await supabase
    .from("raffles")
    .insert({
      host_id: hostId,
      title: draft.title,
      slug,
      description: draft.description || null,
      category: draft.category,
      status: "live",
      visibility: draft.visibility,
      ticket_price: draft.ticketPrice,
      ticket_cap: draft.unlimited ? null : draft.ticketCap,
      bundle_rules,
      draw_type: draft.drawType,
      draw_date:
        draft.drawType === "date" && draft.drawDate
          ? new Date(draft.drawDate).toISOString()
          : null,
      min_ticket_target: draft.minTicketTarget || null,
      charity_percent: draft.charityEnabled ? draft.charityPercent : 0,
      affiliate_percent: draft.affiliateEnabled ? draft.affiliatePercent : 0,
      featured_until: draft.featured
        ? new Date(Date.now() + 30 * 86_400_000).toISOString()
        : null,
    })
    .select("slug")
    .single();

  if (error) throw error;
  return data;
}
