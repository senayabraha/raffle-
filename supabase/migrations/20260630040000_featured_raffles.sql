-- Homepage "Featured Raffles" carousel: admin-curated, up to 12 raffles in a
-- fixed display order. Reuses private.is_admin() from admin_foundation — no
-- new admin-check logic.

create table public.featured_raffles (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null unique references public.raffles (id) on delete cascade,
  display_order int not null,
  created_at timestamptz not null default now()
);

alter table public.featured_raffles enable row level security;

create policy "Anyone can view featured raffles"
  on public.featured_raffles for select
  using (true);

create policy "Admins can insert featured raffles"
  on public.featured_raffles for insert
  with check (private.is_admin());

create policy "Admins can update featured raffles"
  on public.featured_raffles for update
  using (private.is_admin());

create policy "Admins can delete featured raffles"
  on public.featured_raffles for delete
  using (private.is_admin());
