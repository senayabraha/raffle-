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
  image_url: string | null;
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
    icon: style.icon,
    gradient: style.gradient,
    image: row.image_url ?? null,
    host: hostName,
    hostInitials: initials || "RH",
    status: row.status === "ended" ? "ended" : "live",
    ticketPrice: Number(row.ticket_price),
    sold: row.tickets_sold_count,
    cap: row.ticket_cap ?? Math.max(row.tickets_sold_count * 2, 1000),
    drawDate:
      row.draw_date ??
      new Date(Date.now() + 7 * 86_400_000).toISOString(),
    bundles: parseBundles(row.bundle_rules),
  };
}

const HOST_SELECT =
  "id, slug, title, description, category, visibility, status, ticket_price, ticket_cap, tickets_sold_count, bundle_rules, draw_date, image_url, host:profiles!raffles_host_id_fkey(full_name)";

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
): Promise<PurchaseResult> {
  const { data, error } = await supabase.rpc("purchase_tickets", {
    p_raffle_id: raffleId,
    p_qty: qty,
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

export interface HostRaffleSummary {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "live" | "ended" | "cancelled";
  icon: LucideIcon;
  sold: number;
  cap: number;
  ticketPrice: number;
  revenue: number;
}

export interface HostActivityItem {
  id: string;
  raffleTitle: string;
  entryType: string;
  createdAt: string;
}

export interface HostOverview {
  raffles: HostRaffleSummary[];
  totals: {
    revenue: number;
    ticketsSold: number;
    liveCount: number;
    sellThrough: number;
  };
  /** Tickets sold per day over the last 14 days. */
  salesSeries: number[];
  activity: HostActivityItem[];
}

/** Aggregates a host's own raffles and recent ticket activity for the dashboard. */
export async function fetchHostOverview(hostId: string): Promise<HostOverview> {
  const { data: raffleRows } = await supabase
    .from("raffles")
    .select(
      "id, slug, title, category, status, ticket_price, ticket_cap, tickets_sold_count",
    )
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });

  const raffles: HostRaffleSummary[] = (raffleRows ?? []).map((r) => {
    const style = (r.category && categoryStyle[r.category]) || fallbackStyle;
    const sold = r.tickets_sold_count;
    const price = Number(r.ticket_price);
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      status: r.status,
      icon: style.icon,
      sold,
      cap: r.ticket_cap ?? Math.max(sold, 1),
      ticketPrice: price,
      revenue: sold * price,
    };
  });

  const totals = {
    revenue: raffles.reduce((s, r) => s + r.revenue, 0),
    ticketsSold: raffles.reduce((s, r) => s + r.sold, 0),
    liveCount: raffles.filter((r) => r.status === "live").length,
    sellThrough: raffles.length
      ? (raffles.reduce((s, r) => s + Math.min(r.sold / r.cap, 1), 0) /
          raffles.length) *
        100
      : 0,
  };

  // Build a 14-day sales series and a recent-activity list from real tickets.
  const salesSeries = new Array(14).fill(0) as number[];
  let activity: HostActivityItem[] = [];
  const ids = raffles.map((r) => r.id);

  if (ids.length) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 13);

    const { data: ticketRows } = await supabase
      .from("tickets")
      .select("id, created_at, entry_type, raffle_id")
      .in("raffle_id", ids)
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false });

    if (ticketRows) {
      const titleById = new Map(raffles.map((r) => [r.id, r.title]));
      for (const t of ticketRows) {
        const day = Math.floor(
          (new Date(t.created_at).setHours(0, 0, 0, 0) - start.getTime()) /
            86_400_000,
        );
        if (day >= 0 && day < 14) salesSeries[day] += 1;
      }
      activity = ticketRows.slice(0, 6).map((t) => ({
        id: t.id,
        raffleTitle: titleById.get(t.raffle_id) ?? "A raffle",
        entryType: t.entry_type,
        createdAt: t.created_at,
      }));
    }
  }

  return { raffles, totals, salesSeries, activity };
}

export interface EndedRaffleSummary {
  id: string;
  title: string;
  category: string;
  sold: number;
  ticketPrice: number;
  drawDate: string | null;
  prizeStatus: "pending" | "confirmed" | "disputed";
  winner: {
    name: string;
    initials: string;
    ticket: number | null;
    region: string | null;
  } | null;
  audit: {
    method: string;
    seed: string;
    entries: number;
    drawnTicketNumber: number | null;
    createdAt: string;
  } | null;
}

/** Loads a host's most recently ended raffle, with winner and audit details when available. */
export async function fetchHostEndedRaffle(
  hostId: string,
): Promise<EndedRaffleSummary | null> {
  const { data: raffle } = await supabase
    .from("raffles")
    .select(
      "id, title, category, ticket_price, tickets_sold_count, draw_date, prize_status",
    )
    .eq("host_id", hostId)
    .eq("status", "ended")
    .order("draw_date", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!raffle) return null;

  const [{ data: winnerRow }, { data: auditRow }] = await Promise.all([
    supabase
      .from("winners")
      .select(
        "winner:profiles!winners_winner_id_fkey(full_name), ticket:tickets!winners_ticket_id_fkey(ticket_number, geo_region)",
      )
      .eq("raffle_id", raffle.id)
      .maybeSingle(),
    supabase
      .from("draw_audit")
      .select("method, seed, entries, drawn_ticket_number, created_at")
      .eq("raffle_id", raffle.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  let winner: EndedRaffleSummary["winner"] = null;
  if (winnerRow) {
    const w = winnerRow as unknown as {
      winner: { full_name: string | null } | null;
      ticket: { ticket_number: number; geo_region: string | null } | null;
    };
    const name = w.winner?.full_name?.trim() || "Winner";
    winner = {
      name,
      initials:
        name
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => p[0])
          .join("")
          .toUpperCase() || "W",
      ticket: w.ticket?.ticket_number ?? null,
      region: w.ticket?.geo_region ?? null,
    };
  }

  const audit = auditRow
    ? {
        method: auditRow.method,
        seed: auditRow.seed,
        entries: auditRow.entries,
        drawnTicketNumber: auditRow.drawn_ticket_number,
        createdAt: auditRow.created_at,
      }
    : null;

  return {
    id: raffle.id,
    title: raffle.title,
    category: raffle.category ?? "Other",
    sold: raffle.tickets_sold_count,
    ticketPrice: Number(raffle.ticket_price),
    drawDate: raffle.draw_date,
    prizeStatus: raffle.prize_status === "revoked" ? "pending" : raffle.prize_status,
    winner,
    audit,
  };
}

/** Host confirms the prize was delivered as advertised or with an agreed modification. */
export async function confirmPrize(
  raffleId: string,
  decision: "advertised" | "modified",
): Promise<{ prizeStatus: string }> {
  const { data, error } = await supabase.rpc("confirm_prize", {
    p_raffle_id: raffleId,
    p_decision: decision,
  });
  if (error) throw error;
  return { prizeStatus: (data as { prize_status: string }).prize_status };
}

export interface MyWinning {
  winnerId: string;
  raffleId: string;
  raffleSlug: string;
  raffleTitle: string;
  ticketNumber: number | null;
  prizeStatus: "awaiting_claim" | "claimed" | "accepted" | "disputed";
  claimDeadline: string | null;
  notifiedAt: string | null;
  acceptedAt: string | null;
  disputedAt: string | null;
}

/** Returns the signed-in entrant's wins, most recent first. */
export async function fetchMyWinnings(userId: string): Promise<MyWinning[]> {
  const { data, error } = await supabase
    .from("winners")
    .select(
      "id, raffle_id, prize_status, claim_deadline, notified_at, accepted_at, disputed_at, ticket:tickets!winners_ticket_id_fkey(ticket_number), raffle:raffles!winners_raffle_id_fkey(slug, title)",
    )
    .eq("winner_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (
    data as unknown as Array<{
      id: string;
      raffle_id: string;
      prize_status: MyWinning["prizeStatus"];
      claim_deadline: string | null;
      notified_at: string | null;
      accepted_at: string | null;
      disputed_at: string | null;
      ticket: { ticket_number: number } | null;
      raffle: { slug: string; title: string } | null;
    }>
  ).map((row) => ({
    winnerId: row.id,
    raffleId: row.raffle_id,
    raffleSlug: row.raffle?.slug ?? "",
    raffleTitle: row.raffle?.title ?? "Raffle",
    ticketNumber: row.ticket?.ticket_number ?? null,
    prizeStatus: row.prize_status,
    claimDeadline: row.claim_deadline,
    notifiedAt: row.notified_at,
    acceptedAt: row.accepted_at,
    disputedAt: row.disputed_at,
  }));
}

/** Entrant accepts or disputes a prize they won, before the claim deadline. */
export async function respondToWin(
  winnerId: string,
  decision: "accept" | "dispute",
): Promise<{ prizeStatus: string }> {
  const { data, error } = await supabase.rpc("respond_to_win", {
    p_winner_id: winnerId,
    p_decision: decision,
  });
  if (error) throw error;
  return { prizeStatus: (data as { prize_status: string }).prize_status };
}

export interface PublicWinner {
  id: string;
  raffleSlug: string;
  raffleTitle: string;
  category: string;
  ticketPrice: number;
  drawDate: string | null;
  winnerName: string;
  winnerInitials: string;
  ticketNumber: number | null;
}

type WinnerRowWithRaffle = {
  id: string;
  winner: { full_name: string | null } | { full_name: string | null }[] | null;
  ticket: { ticket_number: number } | { ticket_number: number }[] | null;
  raffle:
    | {
        slug: string;
        title: string;
        category: string | null;
        ticket_price: number;
        draw_date: string | null;
        visibility: "public" | "private";
        status: string;
      }
    | {
        slug: string;
        title: string;
        category: string | null;
        ticket_price: number;
        draw_date: string | null;
        visibility: "public" | "private";
        status: string;
      }[]
    | null;
};

/** Fetches winners of ended, public raffles for the public Winners page. */
export async function fetchPublicWinners(): Promise<PublicWinner[]> {
  const { data, error } = await supabase
    .from("winners")
    .select(
      "id, winner:profiles!winners_winner_id_fkey(full_name), ticket:tickets!winners_ticket_id_fkey(ticket_number), raffle:raffles!winners_raffle_id_fkey(slug, title, category, ticket_price, draw_date, visibility, status)",
    )
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as WinnerRowWithRaffle[])
    .map((row) => {
      const raffle = Array.isArray(row.raffle) ? row.raffle[0] : row.raffle;
      const winner = Array.isArray(row.winner) ? row.winner[0] : row.winner;
      const ticket = Array.isArray(row.ticket) ? row.ticket[0] : row.ticket;
      if (!raffle || raffle.visibility !== "public" || raffle.status !== "ended") return null;

      const name = winner?.full_name?.trim() || "A Raffall entrant";
      const initials =
        name
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => p[0])
          .join("")
          .toUpperCase() || "W";

      return {
        id: row.id,
        raffleSlug: raffle.slug,
        raffleTitle: raffle.title,
        category: raffle.category ?? "Other",
        ticketPrice: Number(raffle.ticket_price),
        drawDate: raffle.draw_date,
        winnerName: name,
        winnerInitials: initials,
        ticketNumber: ticket?.ticket_number ?? null,
      };
    })
    .filter((w): w is PublicWinner => w !== null);
}

const RAFFLE_IMAGES_BUCKET = "raffle-images";

/** Uploads a prize cover photo to Storage and returns its public URL. */
export async function uploadRaffleImage(file: File, hostId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${hostId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(RAFFLE_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from(RAFFLE_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Persists a wizard draft as a live raffle owned by the given host. */
export async function createRaffle(
  draft: RaffleDraft,
  hostId: string,
  imageUrl?: string | null,
) {
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
      image_url: imageUrl || null,
    })
    .select("slug")
    .single();

  if (error) throw error;
  return data;
}
