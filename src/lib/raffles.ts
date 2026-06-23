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
