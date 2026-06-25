-- Admin panel, phase 0: identity, read access, and an accountability log.
-- `admin` has existed in the `user_role` enum since the first migration but
-- was never wired to anything — no RLS bypass, no audit trail. This adds
-- both, and nothing else: every existing policy is left untouched, this
-- only adds new permissive "admins can also see this" policies alongside
-- them (Postgres OR's permissive policies of the same command together).

-- ---------- is_admin() helper ----------
-- Same shape as the existing private.is_raffle_host/is_raffle_public
-- helpers: security definer + private schema so it can be used inside RLS
-- policies without recursion, but can't be called directly as a PostgREST
-- RPC endpoint.
create function private.is_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- Admin action audit log ----------
-- Every admin RPC that mutates state (starting with dispute resolution in
-- the next migration) writes one row here. Without this, the admin panel
-- itself would be the platform's biggest unaudited trust hole.
create table public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_table text not null,
  target_id uuid not null,
  reason text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_admin_actions_target on public.admin_actions (target_table, target_id);
create index idx_admin_actions_actor on public.admin_actions (actor_id);

alter table public.admin_actions enable row level security;

create policy "Admins can view the admin action log"
  on public.admin_actions for select
  using (private.is_admin());

-- No insert/update/delete policy: every write goes through
-- private.log_admin_action() from inside a security-definer RPC, which
-- bypasses RLS as the table owner. Direct client writes stay impossible.

create function private.log_admin_action(
  p_action text,
  p_target_table text,
  p_target_id uuid,
  p_reason text,
  p_meta jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.admin_actions (actor_id, action, target_table, target_id, reason, meta)
  values (auth.uid(), p_action, p_target_table, p_target_id, p_reason, p_meta);
$$;

-- ---------- Admin read access ----------
-- Every other table here is owner-scoped (host/entrant/winner only) — admin
-- needs a platform-wide read view for support and moderation. profiles
-- already has `select using (true)`, so it needs nothing extra.
create policy "Admins can view all raffles"
  on public.raffles for select
  using (private.is_admin());

create policy "Admins can view all payments"
  on public.payments for select
  using (private.is_admin());

create policy "Admins can view all tickets"
  on public.tickets for select
  using (private.is_admin());

create policy "Admins can view all winners"
  on public.winners for select
  using (private.is_admin());

create policy "Admins can view all draw audit rows"
  on public.draw_audit for select
  using (private.is_admin());

-- checkout_contacts has RLS enabled but zero policies today — nobody can
-- read it directly (only the security-definer checkout RPCs touch it).
-- Admin needs it for support lookups on guest checkouts.
create policy "Admins can view all checkout contacts"
  on public.checkout_contacts for select
  using (private.is_admin());
