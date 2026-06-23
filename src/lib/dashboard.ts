import {
  Car,
  Plane,
  Gamepad2,
  Watch,
  Home,
  Banknote,
  Camera,
  Gift,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "./supabase";

const categoryIcon: Record<string, LucideIcon> = {
  Automotive: Car,
  Travel: Plane,
  Tech: Gamepad2,
  Luxury: Watch,
  Property: Home,
  Cash: Banknote,
  Experiences: Camera,
};

export function iconForCategory(category: string | null): LucideIcon {
  return (category && categoryIcon[category]) || Gift;
}

export interface DashRaffle {
  id: string;
  slug: string;
  title: string;
  category: string;
  icon: LucideIcon;
  status: "live" | "ended" | "draw_pending";
  sold: number;
  cap: number;
  revenue: number;
}

export interface DashActivity {
  id: string;
  name: string;
  initials: string;
  action: string;
  detail: string;
  time: string;
  amount?: number;
}

export interface DashDonutSlice {
  label: string;
  value: number;
  tone: string;
}

export interface DashboardData {
  hasData: boolean;
  revenue: number;
  ticketsSold: number;
  liveRaffles: number;
  entrants: number;
  liveRafflesList: DashRaffle[];
  activity: DashActivity[];
  salesSeries: number[];
  entryBreakdown: DashDonutSlice[];
}

const EMPTY: DashboardData = {
  hasData: false,
  revenue: 0,
  ticketsSold: 0,
  liveRaffles: 0,
  entrants: 0,
  liveRafflesList: [],
  activity: [],
  salesSeries: [],
  entryBreakdown: [],
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "??"
  );
}

function timeAgo(iso: string) {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const entryMeta: Record<string, { label: string; tone: string }> = {
  paid: { label: "Paid", tone: "#8b5cf6" },
  free_share: { label: "Shared", tone: "#22d3ee" },
  affiliate: { label: "Affiliate", tone: "#f472b6" },
  free_bonus: { label: "Bonus", tone: "#34d399" },
};

/** Aggregates a host's raffles, payments and tickets into dashboard figures. */
export async function fetchHostDashboard(hostId: string): Promise<DashboardData> {
  const { data: raffles } = await supabase
    .from("raffles")
    .select(
      "id, slug, title, category, status, ticket_price, ticket_cap, tickets_sold_count, draw_date",
    )
    .eq("host_id", hostId)
    .order("created_at", { ascending: false });

  if (!raffles || raffles.length === 0) return EMPTY;
  const ids = raffles.map((r) => r.id);

  const [{ data: payments }, { data: tickets }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "raffle_id, amount_gross, host_net, status, created_at, payer:profiles!payments_payer_id_fkey(full_name), raffle:raffles!payments_raffle_id_fkey(title)",
      )
      .in("raffle_id", ids)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("tickets")
      .select("entry_type, created_at, entrant_id")
      .in("raffle_id", ids),
  ]);

  const pays = (payments ?? []) as unknown as Array<{
    raffle_id: string;
    amount_gross: number;
    host_net: number;
    status: string;
    created_at: string;
    payer: { full_name: string | null } | null;
    raffle: { title: string | null } | null;
  }>;
  const tix = (tickets ?? []) as Array<{
    entry_type: string;
    created_at: string;
    entrant_id: string | null;
  }>;

  // Revenue per raffle (held + released counts toward earnings).
  const revByRaffle = new Map<string, number>();
  let revenue = 0;
  for (const p of pays) {
    const net = Number(p.host_net);
    revByRaffle.set(p.raffle_id, (revByRaffle.get(p.raffle_id) ?? 0) + net);
    if (p.status === "held") revenue += net;
  }

  const ticketsSold = raffles.reduce((s, r) => s + r.tickets_sold_count, 0);
  const liveCount = raffles.filter((r) => r.status === "live").length;
  const entrants = new Set(tix.map((t) => t.entrant_id).filter(Boolean)).size;

  const liveRafflesList: DashRaffle[] = raffles.slice(0, 6).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    category: r.category ?? "Other",
    icon: iconForCategory(r.category),
    status: r.status === "ended" ? "ended" : "live",
    sold: r.tickets_sold_count,
    cap: r.ticket_cap ?? Math.max(r.tickets_sold_count, 1),
    revenue: revByRaffle.get(r.id) ?? 0,
  }));

  const activity: DashActivity[] = pays.slice(0, 6).map((p, i) => {
    const name = p.payer?.full_name?.trim() || "An entrant";
    return {
      id: `${p.created_at}-${i}`,
      name,
      initials: initials(name),
      action: "bought tickets",
      detail: p.raffle?.title ?? "a raffle",
      time: timeAgo(p.created_at),
      amount: Number(p.amount_gross),
    };
  });

  // 14-day daily ticket volume.
  const series = new Array(14).fill(0);
  const now = Date.now();
  for (const t of tix) {
    const dayIdx = 13 - Math.floor((now - new Date(t.created_at).getTime()) / 86_400_000);
    if (dayIdx >= 0 && dayIdx < 14) series[dayIdx] += 1;
  }

  // Entry-type breakdown for the donut.
  const counts = new Map<string, number>();
  for (const t of tix) counts.set(t.entry_type, (counts.get(t.entry_type) ?? 0) + 1);
  const totalTix = tix.length;
  const entryBreakdown: DashDonutSlice[] =
    totalTix > 0
      ? [...counts.entries()].map(([type, n]) => ({
          label: entryMeta[type]?.label ?? type,
          value: Math.round((n / totalTix) * 100),
          tone: entryMeta[type]?.tone ?? "#8b5cf6",
        }))
      : [];

  return {
    hasData: true,
    revenue,
    ticketsSold,
    liveRaffles: liveCount,
    entrants,
    liveRafflesList,
    activity,
    salesSeries: series,
    entryBreakdown,
  };
}
