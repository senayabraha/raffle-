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

export type SuspensionStatus = "active" | "temporary" | "permanent";

export interface AdminRaffleRow {
  id: string;
  slug: string;
  title: string;
  status: RaffleStatus;
  visibility: Tables<"raffles">["visibility"];
  ticketPrice: number;
  ticketsSold: number;
  ticketCap: number | null;
  drawDate: string | null;
  hostName: string;
  hostEmail: string | null;
  hasFreeEntryRoute: boolean;
  suspensionStatus: SuspensionStatus;
  suspendedUntil: string | null;
}

/** All raffles platform-wide, regardless of host or visibility. */
export async function fetchAdminRaffles(): Promise<AdminRaffleRow[]> {
  const { data, error } = await supabase
    .from("raffles")
    .select(
      "id, slug, title, status, visibility, ticket_price, tickets_sold_count, ticket_cap, draw_date, bundle_rules, suspension_status, suspended_until, host:profiles!raffles_host_id_fkey(full_name, email)",
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
      ticket_cap: number | null;
      draw_date: string | null;
      bundle_rules: unknown;
      suspension_status: SuspensionStatus;
      suspended_until: string | null;
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
    ticketCap: r.ticket_cap,
    drawDate: r.draw_date,
    hostName: r.host?.full_name?.trim() || "Unknown host",
    hostEmail: r.host?.email ?? null,
    hasFreeEntryRoute: Array.isArray(r.bundle_rules) && r.bundle_rules.length > 0,
    suspensionStatus: r.suspension_status,
    suspendedUntil: r.suspended_until,
  }));
}

/** Temporarily or permanently suspends a raffle, hiding the ticket purchase
 * flow without disturbing its underlying `status` lifecycle. */
export async function suspendRaffle(
  raffleId: string,
  type: "temporary" | "permanent",
  reason: string,
  until?: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_suspend_raffle", {
    p_raffle_id: raffleId,
    p_type: type,
    p_reason: reason,
    p_until: until ?? null,
  });
  if (error) throw error;
}

export async function unsuspendRaffle(raffleId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("admin_unsuspend_raffle", {
    p_raffle_id: raffleId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function extendRaffleDraw(
  raffleId: string,
  newDrawDate: string,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_extend_raffle_draw", {
    p_raffle_id: raffleId,
    p_new_draw_date: newDrawDate,
    p_reason: reason,
  });
  if (error) throw error;
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
  status: string;
  subscriptionTier: Tables<"profiles">["subscription_tier"];
  createdAt: string;
  suspensionType: "temporary" | "permanent" | null;
  suspensionEndsAt: string | null;
  raffleCount: number;
}

/** All registered users, for support lookups and role auditing. */
export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const [{ data, error }, raffleCounts] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, full_name, email, role, status, subscription_tier, created_at, suspension_type, suspension_ends_at",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("raffles").select("host_id"),
  ]);
  if (error || !data) return [];

  const countByHost = new Map<string, number>();
  for (const r of raffleCounts.data ?? []) {
    countByHost.set(r.host_id, (countByHost.get(r.host_id) ?? 0) + 1);
  }

  return data.map((p) => ({
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    role: p.role,
    status: p.status,
    subscriptionTier: p.subscription_tier,
    createdAt: p.created_at,
    suspensionType: (p.suspension_type as "temporary" | "permanent" | null) ?? null,
    suspensionEndsAt: p.suspension_ends_at,
    raffleCount: countByHost.get(p.id) ?? 0,
  }));
}

/** Suspends a user. If the account hosts active raffles, each is cascaded
 * into a temporary suspension server-side (see admin_suspend_user). */
export async function suspendUser(
  userId: string,
  type: "temporary" | "permanent",
  reason: string,
  endsAt?: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_suspend_user", {
    p_user_id: userId,
    p_type: type,
    p_reason: reason,
    p_ends_at: endsAt ?? null,
  });
  if (error) throw error;
}

/** Reinstates a suspended user. Does not touch their raffles — those must
 * be unsuspended individually from the Raffles page. */
export async function unsuspendUser(userId: string, reason: string): Promise<void> {
  const { error } = await supabase.rpc("admin_unsuspend_user", {
    p_user_id: userId,
    p_reason: reason,
  });
  if (error) throw error;
}

/** Unpublishes or force-cancels a live raffle. Rejected once it's been drawn. */
export async function setRaffleStatus(
  raffleId: string,
  status: "draft" | "cancelled",
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_raffle_status", {
    p_raffle_id: raffleId,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw error;
}

/** Suspends or reinstates a user. Does not auto-cancel their live raffles. */
export async function setUserStatus(
  userId: string,
  status: "active" | "suspended",
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_status", {
    p_user_id: userId,
    p_status: status,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function setUserRole(
  userId: string,
  role: UserRole,
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_user_role", {
    p_user_id: userId,
    p_role: role,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function setSubscriptionTier(
  userId: string,
  tier: Tables<"profiles">["subscription_tier"],
  reason: string,
): Promise<void> {
  const { error } = await supabase.rpc("admin_set_subscription_tier", {
    p_user_id: userId,
    p_tier: tier,
    p_reason: reason,
  });
  if (error) throw error;
}

/** JSON bundle of everything tied to a user, for subject-access requests. */
export async function exportUserData(userId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("admin_export_user_data", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export interface HostRiskRow {
  hostId: string;
  hostName: string;
  hostEmail: string | null;
  raffleCount: number;
  disputeCount: number;
  compensatedCount: number;
}

/** Hosts ranked by dispute/compensation rate — a pure read over Phase 1's data. */
export async function fetchHostRiskLeaderboard(): Promise<HostRiskRow[]> {
  const { data, error } = await supabase
    .from("raffles")
    .select(
      "host_id, prize_status, host:profiles!raffles_host_id_fkey(full_name, email)",
    );
  if (error || !data) return [];

  const byHost = new Map<string, HostRiskRow>();
  for (const r of data as unknown as Array<{
    host_id: string;
    prize_status: Tables<"raffles">["prize_status"];
    host: { full_name: string | null; email: string | null } | null;
  }>) {
    const existing = byHost.get(r.host_id) ?? {
      hostId: r.host_id,
      hostName: r.host?.full_name?.trim() || "Unknown host",
      hostEmail: r.host?.email ?? null,
      raffleCount: 0,
      disputeCount: 0,
      compensatedCount: 0,
    };
    existing.raffleCount += 1;
    if (r.prize_status === "disputed") existing.disputeCount += 1;
    if (r.prize_status === "revoked") existing.compensatedCount += 1;
    byHost.set(r.host_id, existing);
  }

  return Array.from(byHost.values()).sort(
    (a, b) => b.disputeCount + b.compensatedCount - (a.disputeCount + a.compensatedCount),
  );
}

export interface AdminActivityRow {
  id: string;
  action: string;
  targetTable: string;
  reason: string | null;
  meta: Record<string, unknown>;
  actorName: string;
  createdAt: string;
}

/** Last 10 admin actions from the existing audit log, for the overview's
 * recent activity feed. There is no separate activity_log table — every
 * admin RPC already writes here via private.log_admin_action(). */
export async function fetchRecentActivity(): Promise<AdminActivityRow[]> {
  const { data, error } = await supabase
    .from("admin_actions")
    .select("id, action, target_table, reason, meta, created_at, actor:profiles!admin_actions_actor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data) return [];

  return (
    data as unknown as Array<{
      id: string;
      action: string;
      target_table: string;
      reason: string | null;
      meta: Record<string, unknown>;
      created_at: string;
      actor: { full_name: string | null } | null;
    }>
  ).map((row) => ({
    id: row.id,
    action: row.action,
    targetTable: row.target_table,
    reason: row.reason,
    meta: row.meta ?? {},
    actorName: row.actor?.full_name?.trim() || "Admin",
    createdAt: row.created_at,
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

export interface AdminCancellationRow {
  id: string;
  raffleId: string;
  raffleTitle: string;
  raffleSlug: string;
  hostName: string;
  hostEmail: string | null;
  ticketsSold: number;
  reason: string;
  createdAt: string;
}

/** Pending host-filed cancellation requests — the admin review queue. */
export async function fetchCancellationRequests(): Promise<AdminCancellationRow[]> {
  const { data, error } = await supabase
    .from("cancellation_requests")
    .select(
      "id, raffle_id, reason, created_at, raffle:raffles!cancellation_requests_raffle_id_fkey(title, slug, tickets_sold_count), host:profiles!cancellation_requests_host_id_fkey(full_name, email)",
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error || !data) return [];

  return (
    data as unknown as Array<{
      id: string;
      raffle_id: string;
      reason: string;
      created_at: string;
      raffle: { title: string; slug: string; tickets_sold_count: number } | null;
      host: { full_name: string | null; email: string | null } | null;
    }>
  ).map((r) => ({
    id: r.id,
    raffleId: r.raffle_id,
    raffleTitle: r.raffle?.title ?? "Raffle",
    raffleSlug: r.raffle?.slug ?? "",
    hostName: r.host?.full_name?.trim() || "Unknown host",
    hostEmail: r.host?.email ?? null,
    ticketsSold: r.raffle?.tickets_sold_count ?? 0,
    reason: r.reason,
    createdAt: r.created_at,
  }));
}

/** Admin approves a cancellation (cancels the raffle, refunds held payments
 * and notifies the host) or rejects it. Always logged. */
export async function resolveCancellationRequest(
  requestId: string,
  decision: "approve" | "reject",
  note: string,
): Promise<{ status: string }> {
  const { data, error } = await supabase.rpc("admin_resolve_cancellation", {
    p_request_id: requestId,
    p_decision: decision,
    p_note: note,
  });
  if (error) throw error;
  return { status: (data as { status: string }).status };
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
