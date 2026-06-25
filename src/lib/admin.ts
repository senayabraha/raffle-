import { supabase } from "./supabase";
import type { Tables } from "./database.types";

type RaffleStatus = Tables<"raffles">["status"];
type PaymentStatus = Tables<"payments">["status"];
type UserRole = Tables<"profiles">["role"];
type WinnerPrizeStatus = Tables<"winners">["prize_status"];

/** Platform-wide totals for the admin overview page. */
export interface AdminOverview {
  liveRaffleCount: number;
  totalRaffleCount: number;
  grossVolume: number;
  platformCommission: number;
  userCount: number;
  hostCount: number;
  disputedCount: number;
}

export async function fetchAdminOverview(): Promise<AdminOverview> {
  const [raffles, payments, profiles, disputed] = await Promise.all([
    supabase.from("raffles").select("status"),
    supabase
      .from("payments")
      .select("amount_gross, platform_commission, status"),
    supabase.from("profiles").select("role"),
    supabase.from("winners").select("id", { count: "exact", head: true }).eq("prize_status", "disputed"),
  ]);

  const raffleRows = raffles.data ?? [];
  const paymentRows = payments.data ?? [];
  const profileRows = profiles.data ?? [];

  const settledStatuses: PaymentStatus[] = ["held", "released", "compensated"];

  return {
    liveRaffleCount: raffleRows.filter((r) => r.status === "live").length,
    totalRaffleCount: raffleRows.length,
    grossVolume: paymentRows
      .filter((p) => settledStatuses.includes(p.status))
      .reduce((sum, p) => sum + Number(p.amount_gross ?? 0), 0),
    platformCommission: paymentRows
      .filter((p) => settledStatuses.includes(p.status))
      .reduce((sum, p) => sum + Number(p.platform_commission ?? 0), 0),
    userCount: profileRows.length,
    hostCount: profileRows.filter((p) => p.role === "host" || p.role === "both").length,
    disputedCount: disputed.count ?? 0,
  };
}

export interface AdminRaffleRow {
  id: string;
  slug: string;
  title: string;
  status: RaffleStatus;
  visibility: Tables<"raffles">["visibility"];
  ticketPrice: number;
  ticketsSold: number;
  drawDate: string | null;
  hostName: string;
  hostEmail: string | null;
}

/** All raffles platform-wide, regardless of host or visibility. */
export async function fetchAdminRaffles(): Promise<AdminRaffleRow[]> {
  const { data, error } = await supabase
    .from("raffles")
    .select(
      "id, slug, title, status, visibility, ticket_price, tickets_sold_count, draw_date, host:profiles!raffles_host_id_fkey(full_name, email)",
    )
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  return (
    data as unknown as Array<{
      id: string;
      slug: string;
      title: string;
      status: RaffleStatus;
      visibility: Tables<"raffles">["visibility"];
      ticket_price: number;
      tickets_sold_count: number;
      draw_date: string | null;
      host: { full_name: string | null; email: string | null } | null;
    }>
  ).map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    status: r.status,
    visibility: r.visibility,
    ticketPrice: Number(r.ticket_price),
    ticketsSold: r.tickets_sold_count,
    drawDate: r.draw_date,
    hostName: r.host?.full_name?.trim() || "Unknown host",
    hostEmail: r.host?.email ?? null,
  }));
}

export interface AdminDrawAuditRow {
  method: string;
  seed: string;
  entries: number;
  drawnTicketNumber: number | null;
  createdAt: string;
}

/** Draw audit trail for a single raffle — the fairness evidence behind a draw. */
export async function fetchAdminDrawAudit(raffleId: string): Promise<AdminDrawAuditRow[]> {
  const { data, error } = await supabase
    .from("draw_audit")
    .select("method, seed, entries, drawn_ticket_number, created_at")
    .eq("raffle_id", raffleId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((d) => ({
    method: d.method,
    seed: d.seed,
    entries: d.entries,
    drawnTicketNumber: d.drawn_ticket_number,
    createdAt: d.created_at,
  }));
}

export interface AdminPaymentRow {
  id: string;
  raffleTitle: string;
  amountGross: number | null;
  platformCommission: number;
  status: PaymentStatus;
  provider: Tables<"payments">["provider"];
  payerName: string;
  createdAt: string;
}

/** All payments platform-wide, joined to the buyer's name (account or guest). */
export async function fetchAdminPayments(): Promise<AdminPaymentRow[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, amount_gross, platform_commission, status, provider, created_at, raffle:raffles!payments_raffle_id_fkey(title), payer:profiles!payments_payer_id_fkey(full_name), checkout_contacts(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];

  return (
    data as unknown as Array<{
      id: string;
      amount_gross: number | null;
      platform_commission: number;
      status: PaymentStatus;
      provider: Tables<"payments">["provider"];
      created_at: string;
      raffle: { title: string } | null;
      payer: { full_name: string | null } | null;
      checkout_contacts: { full_name: string | null } | { full_name: string | null }[] | null;
    }>
  ).map((p) => {
    const contact = Array.isArray(p.checkout_contacts)
      ? p.checkout_contacts[0]
      : p.checkout_contacts;
    return {
      id: p.id,
      raffleTitle: p.raffle?.title ?? "Unknown raffle",
      amountGross: p.amount_gross,
      platformCommission: Number(p.platform_commission),
      status: p.status,
      provider: p.provider,
      payerName: p.payer?.full_name?.trim() || contact?.full_name?.trim() || "Guest",
      createdAt: p.created_at,
    };
  });
}

export interface AdminUserRow {
  id: string;
  fullName: string | null;
  email: string | null;
  role: UserRole;
  subscriptionTier: Tables<"profiles">["subscription_tier"];
  createdAt: string;
}

/** All registered users, for support lookups and role auditing. */
export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, role, subscription_tier, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    role: p.role,
    subscriptionTier: p.subscription_tier,
    createdAt: p.created_at,
  }));
}

export interface AdminDisputeRow {
  winnerId: string;
  raffleId: string;
  raffleTitle: string;
  raffleSlug: string;
  winnerName: string;
  ticketNumber: number | null;
  prizeStatus: WinnerPrizeStatus;
  disputedAt: string | null;
}

/** Winners currently sitting in a `disputed` state — the admin resolution queue. */
export async function fetchAdminDisputes(): Promise<AdminDisputeRow[]> {
  const { data, error } = await supabase
    .from("winners")
    .select(
      "id, raffle_id, prize_status, disputed_at, winner:profiles!winners_winner_id_fkey(full_name), ticket:tickets!winners_ticket_id_fkey(ticket_number), raffle:raffles!winners_raffle_id_fkey(slug, title)",
    )
    .eq("prize_status", "disputed")
    .order("disputed_at", { ascending: false });
  if (error || !data) return [];

  return (
    data as unknown as Array<{
      id: string;
      raffle_id: string;
      prize_status: WinnerPrizeStatus;
      disputed_at: string | null;
      winner: { full_name: string | null } | null;
      ticket: { ticket_number: number } | null;
      raffle: { slug: string; title: string } | null;
    }>
  ).map((w) => ({
    winnerId: w.id,
    raffleId: w.raffle_id,
    raffleTitle: w.raffle?.title ?? "Raffle",
    raffleSlug: w.raffle?.slug ?? "",
    winnerName: w.winner?.full_name?.trim() || "Unknown entrant",
    ticketNumber: w.ticket?.ticket_number ?? null,
    prizeStatus: w.prize_status,
    disputedAt: w.disputed_at,
  }));
}

/** Admin resolves a disputed prize, either upholding the entrant's dispute
 * (compensation, mirroring the automated guarantee path) or the host's
 * delivery (accepted, mirroring confirm_prize). Always logged. */
export async function resolveDispute(
  winnerId: string,
  decision: "uphold_entrant" | "uphold_host",
  reason: string,
): Promise<{ prizeStatus: string }> {
  const { data, error } = await supabase.rpc("admin_resolve_dispute", {
    p_winner_id: winnerId,
    p_decision: decision,
    p_reason: reason,
  });
  if (error) throw error;
  return { prizeStatus: (data as { prize_status: string }).prize_status };
}
