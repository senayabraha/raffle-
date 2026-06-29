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

/**
 * Revenue Planner state persisted alongside a raffle as a jsonb column.
 * Declared as a type alias (not an interface) so it carries an implicit index
 * signature and stays assignable to the generated `Json` column type.
 */
export type PlannerState = {
  prize_value: number | null;
  profit_target_pct: number;
  profit_target_etb: number;
  ticket_price: number;
  ticket_cap: number;
};

/** Serialises the wizard's planner fields into the jsonb planner_state column. */
export function plannerStateFromDraft(draft: RaffleDraft): PlannerState {
  return {
    prize_value: draft.plannerPrizeValue ?? draft.prizeValue,
    profit_target_pct: draft.plannerProfitTargetPct,
    profit_target_etb: draft.plannerProfitTargetEtb,
    ticket_price: draft.plannerTicketPrice,
    ticket_cap: draft.plannerTicketCap,
  };
}

/** Reads a stored planner_state jsonb value back into a typed object, or null. */
export function parsePlannerState(raw: unknown): PlannerState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    prize_value: o.prize_value == null ? null : Number(o.prize_value),
    profit_target_pct: Number(o.profit_target_pct) || 0,
    profit_target_etb: Number(o.profit_target_etb) || 0,
    ticket_price: Number(o.ticket_price) || 0,
    ticket_cap: Number(o.ticket_cap) || 0,
  };
}

export function parseBundles(raw: unknown): Bundle[] {
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
  image_urls: string[] | null;
  prize_value: number | null;
  suspension_status: "active" | "temporary" | "permanent";
  suspended_until: string | null;
  host: { full_name: string | null } | { full_name: string | null }[] | null;
};

/** Maps a DB raffle row (with joined host) into the marketplace card shape. */
export function mapRaffleRow(row: RaffleRowWithHost): MarketplaceRaffle {
  const style = (row.category && categoryStyle[row.category]) || fallbackStyle;
  const hostObj = Array.isArray(row.host) ? row.host[0] : row.host;
  const hostName = hostObj?.full_name?.trim() || "A እድል44 host";
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
    image: row.image_urls?.[0] ?? null,
    images: row.image_urls ?? [],
    prizeValue: row.prize_value != null ? Number(row.prize_value) : null,
    host: hostName,
    hostInitials: initials || "RH",
    hostVerified: false,
    status: row.status === "ended" ? "ended" : "live",
    ticketPrice: Number(row.ticket_price),
    sold: row.tickets_sold_count,
    cap: row.ticket_cap ?? Math.max(row.tickets_sold_count * 2, 1000),
    drawDate:
      row.draw_date ??
      new Date(Date.now() + 7 * 86_400_000).toISOString(),
    bundles: parseBundles(row.bundle_rules),
    suspensionStatus: row.suspension_status,
    suspendedUntil: row.suspended_until,
  };
}

const HOST_SELECT =
  "id, slug, title, description, category, visibility, status, ticket_price, ticket_cap, tickets_sold_count, bundle_rules, draw_date, image_urls, prize_value, suspension_status, suspended_until, host:profiles!raffles_host_id_fkey(full_name)";

/** Fetches live, public raffles for the marketplace. Suspended raffles are
 * hidden from the listing, but remain reachable via their direct link. */
export async function fetchPublicRaffles(): Promise<MarketplaceRaffle[]> {
  const { data, error } = await supabase
    .from("raffles")
    .select(HOST_SELECT)
    .eq("visibility", "public")
    .eq("status", "live")
    .eq("suspension_status", "active")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return (data as unknown as RaffleRowWithHost[]).map(mapRaffleRow);
}

/** Fetches a single raffle by slug for the listing page. Suspended raffles
 * are still returned here so the detail page can show the suspended state. */
export async function fetchRaffleBySlug(
  slug: string,
): Promise<MarketplaceRaffle | null> {
  const { data, error } = await supabase
    .from("raffles")
    .select(HOST_SELECT)
    .eq("slug", slug)
    .in("status", ["live", "ended"])
    .maybeSingle();

  if (error || !data) return null;
  return mapRaffleRow(data as unknown as RaffleRowWithHost);
}

export interface RaffleEntrant {
  id: string;
  name: string;
  initials: string;
  ticketNumber: number;
  createdAt: string;
}

type TicketRowWithEntrant = {
  id: string;
  ticket_number: number;
  created_at: string;
  entrant: { full_name: string | null } | { full_name: string | null }[] | null;
};

/** Fetches the most recent entries for a public raffle, for a "recent entries" feed. */
export async function fetchRaffleEntrants(raffleId: string): Promise<RaffleEntrant[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select("id, ticket_number, created_at, entrant:profiles!tickets_entrant_id_fkey(full_name)")
    .eq("raffle_id", raffleId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];

  return (data as unknown as TicketRowWithEntrant[]).map((row) => {
    const entrant = Array.isArray(row.entrant) ? row.entrant[0] : row.entrant;
    const name = entrant?.full_name?.trim() || "A እድል44 entrant";
    const initials =
      name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0])
        .join("")
        .toUpperCase() || "R";

    return {
      id: row.id,
      name,
      initials,
      ticketNumber: row.ticket_number,
      createdAt: row.created_at,
    };
  });
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

/** Loads all of a host's ended raffles, most recently drawn first, with winner and audit details when available. */
export async function fetchHostEndedRaffles(
  hostId: string,
): Promise<EndedRaffleSummary[]> {
  const { data: raffleRows } = await supabase
    .from("raffles")
    .select(
      "id, title, category, ticket_price, tickets_sold_count, draw_date, prize_status",
    )
    .eq("host_id", hostId)
    .eq("status", "ended")
    .order("draw_date", { ascending: false, nullsFirst: false });

  if (!raffleRows || raffleRows.length === 0) return [];

  const ids = raffleRows.map((r) => r.id);

  const [{ data: winnerRows }, { data: auditRows }] = await Promise.all([
    supabase
      .from("winners")
      .select(
        "raffle_id, winner:profiles!winners_winner_id_fkey(full_name), ticket:tickets!winners_ticket_id_fkey(ticket_number, geo_region)",
      )
      .in("raffle_id", ids),
    supabase
      .from("draw_audit")
      .select("raffle_id, method, seed, entries, drawn_ticket_number, created_at")
      .in("raffle_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  const winnerByRaffle = new Map<string, EndedRaffleSummary["winner"]>();
  for (const row of (winnerRows ?? []) as unknown as Array<{
    raffle_id: string;
    winner: { full_name: string | null } | null;
    ticket: { ticket_number: number; geo_region: string | null } | null;
  }>) {
    const name = row.winner?.full_name?.trim() || "Winner";
    winnerByRaffle.set(row.raffle_id, {
      name,
      initials:
        name
          .split(/\s+/)
          .slice(0, 2)
          .map((p) => p[0])
          .join("")
          .toUpperCase() || "W",
      ticket: row.ticket?.ticket_number ?? null,
      region: row.ticket?.geo_region ?? null,
    });
  }

  const auditByRaffle = new Map<string, EndedRaffleSummary["audit"]>();
  for (const row of auditRows ?? []) {
    if (auditByRaffle.has(row.raffle_id)) continue; // keep only the most recent per raffle
    auditByRaffle.set(row.raffle_id, {
      method: row.method,
      seed: row.seed,
      entries: row.entries,
      drawnTicketNumber: row.drawn_ticket_number,
      createdAt: row.created_at,
    });
  }

  return raffleRows.map((raffle) => ({
    id: raffle.id,
    title: raffle.title,
    category: raffle.category ?? "Other",
    sold: raffle.tickets_sold_count,
    ticketPrice: Number(raffle.ticket_price),
    drawDate: raffle.draw_date,
    prizeStatus: raffle.prize_status === "revoked" ? "pending" : raffle.prize_status,
    winner: winnerByRaffle.get(raffle.id) ?? null,
    audit: auditByRaffle.get(raffle.id) ?? null,
  }));
}

/** Loads a single ended raffle the host owns, for the detail/confirm-prize page. */
export async function fetchHostEndedRaffleById(
  raffleId: string,
  hostId: string,
): Promise<EndedRaffleSummary | null> {
  const { data: raffle } = await supabase
    .from("raffles")
    .select(
      "id, title, category, ticket_price, tickets_sold_count, draw_date, prize_status",
    )
    .eq("id", raffleId)
    .eq("host_id", hostId)
    .eq("status", "ended")
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

      const name = winner?.full_name?.trim() || "A እድል44 entrant";
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

/** Uploads a single prize photo to Storage and returns its public URL. */
async function uploadOneRaffleImage(file: File, hostId: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${hostId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(RAFFLE_IMAGES_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (error) throw error;

  const { data } = supabase.storage.from(RAFFLE_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Uploads a host's prize photo gallery, preserving order. */
export async function uploadRaffleImages(files: File[], hostId: string): Promise<string[]> {
  return Promise.all(files.map((file) => uploadOneRaffleImage(file, hostId)));
}

/** Persists a wizard draft as a new raffle owned by the given host. */
export async function createRaffle(
  draft: RaffleDraft,
  hostId: string,
  imageUrls: string[] = [],
  status: "draft" | "live" = "live",
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
      status,
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
      image_urls: imageUrls,
      prize_value: draft.prizeValue || null,
      condition: draft.condition,
      delivery_method: draft.deliveryMethod,
      planner_state: plannerStateFromDraft(draft),
    })
    .select("id, slug")
    .single();

  if (error) throw error;
  return data;
}

/** Updates an existing raffle the host owns — used to resume and publish a saved draft. */
export async function updateRaffle(
  raffleId: string,
  draft: RaffleDraft,
  imageUrls: string[],
  status: "draft" | "live",
) {
  const bundle_rules = draft.bundlesEnabled
    ? [{ buy: draft.bundleQty, free: draft.bundleFree }]
    : [];

  const { data, error } = await supabase
    .from("raffles")
    .update({
      title: draft.title,
      description: draft.description || null,
      category: draft.category,
      status,
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
      image_urls: imageUrls,
      prize_value: draft.prizeValue || null,
      condition: draft.condition,
      delivery_method: draft.deliveryMethod,
      planner_state: plannerStateFromDraft(draft),
    })
    .eq("id", raffleId)
    .select("id, slug")
    .single();

  if (error) throw error;
  return data;
}

export interface RaffleDraftRow {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  prize_value: number | null;
  condition: RaffleDraft["condition"] | null;
  delivery_method: RaffleDraft["deliveryMethod"] | null;
  ticket_price: number;
  ticket_cap: number | null;
  bundle_rules: unknown;
  draw_type: "date" | "soldout";
  draw_date: string | null;
  min_ticket_target: number | null;
  visibility: "public" | "private";
  image_urls: string[] | null;
  planner_state: unknown;
}

/** Loads a host's saved draft raffle so the wizard can resume it. Returns null if it isn't a draft they own. */
export async function fetchHostDraft(
  raffleId: string,
  hostId: string,
): Promise<RaffleDraftRow | null> {
  const { data, error } = await supabase
    .from("raffles")
    .select(
      "id, title, description, category, prize_value, condition, delivery_method, ticket_price, ticket_cap, bundle_rules, draw_type, draw_date, min_ticket_target, visibility, image_urls, planner_state",
    )
    .eq("id", raffleId)
    .eq("host_id", hostId)
    .eq("status", "draft")
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as RaffleDraftRow;
}

export interface RaffleManageDetail {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: "draft" | "live" | "ended" | "cancelled";
  ticketPrice: number;
  ticketCap: number | null;
  ticketsSoldCount: number;
  prizeValue: number | null;
  imageUrls: string[];
  drawDate: string | null;
  drawType: "date" | "soldout" | "hybrid";
  minTicketTarget: number | null;
  bundleRules: unknown;
  visibility: "public" | "private";
  condition: "new" | "used" | "refurbished" | null;
  deliveryMethod: "shipping" | "pickup" | "digital" | "cash_equivalent" | null;
  drawDateExtensionCount: number;
  hasPendingCancelRequest: boolean;
}

/** Loads a single raffle the host owns, for the raffle management page. */
export async function fetchRaffleForManage(
  raffleId: string,
  hostId: string,
): Promise<RaffleManageDetail | null> {
  const { data, error } = await supabase
    .from("raffles")
    .select(
      "id, title, description, category, status, ticket_price, ticket_cap, tickets_sold_count, prize_value, image_urls, draw_date, draw_type, min_ticket_target, bundle_rules, visibility, condition, delivery_method, draw_date_extension_count",
    )
    .eq("id", raffleId)
    .eq("host_id", hostId)
    .maybeSingle();

  if (error || !data) return null;

  const { data: pendingRequest } = await supabase
    .from("cancellation_requests")
    .select("id")
    .eq("raffle_id", raffleId)
    .eq("status", "pending")
    .maybeSingle();

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    category: data.category,
    status: data.status,
    ticketPrice: Number(data.ticket_price),
    ticketCap: data.ticket_cap,
    ticketsSoldCount: data.tickets_sold_count,
    prizeValue: data.prize_value != null ? Number(data.prize_value) : null,
    imageUrls: data.image_urls ?? [],
    drawDate: data.draw_date,
    drawType: data.draw_type,
    minTicketTarget: data.min_ticket_target,
    bundleRules: data.bundle_rules,
    visibility: data.visibility,
    condition: data.condition,
    deliveryMethod: data.delivery_method,
    drawDateExtensionCount: data.draw_date_extension_count,
    hasPendingCancelRequest: pendingRequest != null,
  };
}

/**
 * Full wizard-field edit for a raffle with no entries yet. The UI gates this
 * to `ticketsSoldCount === 0`; the `update_raffle_details` RPC still guards the
 * post-sale price/cap subset server-side as a safety net via its own checks
 * and RLS, so this direct update is only ever issued for editable raffles.
 */
export async function updateRaffleDetails(
  raffleId: string,
  patch: {
    title: string;
    description: string | null;
    category: string | null;
    prizeValue: number | null;
    ticketPrice: number;
    ticketCap: number | null;
    bundleRules: unknown;
    drawType: "date" | "soldout" | "hybrid";
    drawDate: string | null;
    minTicketTarget: number | null;
    visibility: "public" | "private";
    condition: "new" | "used" | "refurbished" | null;
    deliveryMethod: "shipping" | "pickup" | "digital" | "cash_equivalent" | null;
    imageUrls: string[];
  },
): Promise<void> {
  const { error } = await supabase
    .from("raffles")
    .update({
      title: patch.title,
      description: patch.description,
      category: patch.category,
      prize_value: patch.prizeValue,
      ticket_price: patch.ticketPrice,
      ticket_cap: patch.ticketCap,
      bundle_rules: patch.bundleRules as never,
      draw_type: patch.drawType,
      draw_date: patch.drawDate,
      min_ticket_target: patch.minTicketTarget,
      visibility: patch.visibility,
      condition: patch.condition,
      delivery_method: patch.deliveryMethod,
      image_urls: patch.imageUrls,
    })
    .eq("id", raffleId);
  if (error) throw error;
}

/** Host requests a draw-date extension (capped at twice, +15 days each). */
export async function extendDrawDate(
  raffleId: string,
  newDrawDate: string,
): Promise<{ drawDate: string; extensionCount: number }> {
  const { data, error } = await supabase.rpc("host_extend_draw_date", {
    p_raffle_id: raffleId,
    p_new_draw_date: new Date(newDrawDate).toISOString(),
  });
  if (error) throw error;
  const result = data as { draw_date: string; extension_count: number };
  return { drawDate: result.draw_date, extensionCount: result.extension_count };
}

/** Host files a cancellation request for a live raffle that already has entries. */
export async function requestCancellation(
  raffleId: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("host_request_cancellation", {
    p_raffle_id: raffleId,
    p_reason: reason,
  });
  if (error) throw error;
}

/** Manually cancels a live raffle that has no entries yet. */
export async function cancelRaffle(raffleId: string): Promise<void> {
  const { error } = await supabase.rpc("cancel_raffle", { p_raffle_id: raffleId });
  if (error) throw error;
}

export interface RaffleAnalytics {
  sold: number;
  cap: number | null;
  revenue: number;
  /** Tickets sold per day over the last 14 days, for this raffle only. */
  salesSeries: number[];
}

/** Scopes the dashboard's 14-day sales-series pattern to a single raffle, for the management page. */
export async function fetchRaffleAnalytics(raffleId: string): Promise<RaffleAnalytics> {
  const { data: raffle } = await supabase
    .from("raffles")
    .select("ticket_price, ticket_cap, tickets_sold_count")
    .eq("id", raffleId)
    .maybeSingle();

  const sold = raffle?.tickets_sold_count ?? 0;
  const price = raffle ? Number(raffle.ticket_price) : 0;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 13);

  const { data: ticketRows } = await supabase
    .from("tickets")
    .select("created_at")
    .eq("raffle_id", raffleId)
    .gte("created_at", start.toISOString());

  const salesSeries = new Array(14).fill(0) as number[];
  for (const t of ticketRows ?? []) {
    const day = Math.floor(
      (new Date(t.created_at).setHours(0, 0, 0, 0) - start.getTime()) / 86_400_000,
    );
    if (day >= 0 && day < 14) salesSeries[day] += 1;
  }

  return {
    sold,
    cap: raffle?.ticket_cap ?? null,
    revenue: sold * price,
    salesSeries,
  };
}

export interface RaffleOrder {
  paymentId: string;
  ticketNumbers: number[];
  status: string;
  amountGross: number | null;
  provider: string | null;
  createdAt: string;
  contact: {
    fullName: string;
    phone: string;
    email: string;
    city: string;
  } | null;
}

type OrderPaymentRow = {
  id: string;
  status: string;
  amount_gross: number | null;
  provider: string | null;
  created_at: string;
  checkout_contacts: {
    full_name: string;
    phone: string;
    email: string;
    city: string;
  } | { full_name: string; phone: string; email: string; city: string }[] | null;
  tickets: { ticket_number: number }[] | null;
};

/**
 * Host-facing order list for one of their raffles — full contact info and
 * ticket numbers per payment, gated by the "Raffle hosts can view checkout
 * contacts for their orders" RLS policy (scoped to that raffle's host only).
 */
export async function fetchRaffleOrdersForHost(raffleId: string): Promise<RaffleOrder[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, status, amount_gross, provider, created_at, checkout_contacts(full_name, phone, email, city), tickets(ticket_number)",
    )
    .eq("raffle_id", raffleId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];

  return (data as unknown as OrderPaymentRow[]).map((row) => {
    const contact = Array.isArray(row.checkout_contacts)
      ? row.checkout_contacts[0]
      : row.checkout_contacts;
    return {
      paymentId: row.id,
      ticketNumbers: (row.tickets ?? []).map((t) => t.ticket_number),
      status: row.status,
      amountGross: row.amount_gross != null ? Number(row.amount_gross) : null,
      provider: row.provider,
      createdAt: row.created_at,
      contact: contact
        ? {
            fullName: contact.full_name,
            phone: contact.phone,
            email: contact.email,
            city: contact.city,
          }
        : null,
    };
  });
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  raffleId: string | null;
  readAt: string | null;
  createdAt: string;
}

export async function fetchNotifications(userId: string): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, raffle_id, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    raffleId: row.raffle_id,
    readAt: row.read_at,
    createdAt: row.created_at,
  }));
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", notificationIds)
    .is("read_at", null);
}
