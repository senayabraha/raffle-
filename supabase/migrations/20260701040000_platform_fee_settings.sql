-- Admin-controlled fee/tax rates that drive the Revenue Planner (Step 2) and
-- Review (Step 5) cost model in the raffle creation wizard. Previously these
-- rates were hardcoded constants in the front end (CreateRaffle.tsx); this
-- single-row table makes them editable platform-wide from the admin panel.
--
-- Single-row by construction: the `single_row` CHECK pins id = 1, so the table
-- can never hold more than one row — enforced at the database level, not just
-- by convention. Reuses private.is_admin() from admin_foundation for the write
-- policy, matching featured_settings / hero_settings.

create table if not exists public.platform_fee_settings (
  id                       integer primary key default 1,
  lottery_tax_rate         numeric not null default 0.15,
  winner_tax_rate          numeric not null default 0.20,
  social_contribution_rate numeric not null default 0.005,
  platform_fee_rate        numeric not null default 0.10,
  payment_processing_rate  numeric not null default 0.025,
  updated_at               timestamptz not null default now(),
  updated_by               uuid references auth.users (id),
  constraint single_row check (id = 1)
);

-- Seed the single row.
insert into public.platform_fee_settings (id)
values (1)
on conflict (id) do nothing;

-- RLS: readable by everyone (the planner must calculate for any host), writable
-- only by admins.
alter table public.platform_fee_settings enable row level security;

create policy "Anyone can read fee settings"
  on public.platform_fee_settings for select
  using (true);

-- private.is_admin() is the established admin-role check in this codebase
-- (security definer + private schema, role = 'admin' on profiles). Using it
-- here avoids the RLS recursion that an inline EXISTS over profiles can cause.
create policy "Only admins can update fee settings"
  on public.platform_fee_settings for update
  using (private.is_admin());
