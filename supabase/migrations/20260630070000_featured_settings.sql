-- Single-row settings table controlling how many Featured Raffles cards are
-- visible at once on mobile vs desktop. Reuses private.is_admin() from
-- admin_foundation — no new admin-check logic.

create table public.featured_settings (
  id int primary key default 1,
  cards_per_screen_mobile float not null default 2.5,
  cards_per_screen_desktop float not null default 4.0
);

insert into public.featured_settings (id, cards_per_screen_mobile, cards_per_screen_desktop)
values (1, 2.5, 4.0);

alter table public.featured_settings enable row level security;

create policy "Anyone can view featured settings"
  on public.featured_settings for select
  using (true);

create policy "Admins can update featured settings"
  on public.featured_settings for update
  using (private.is_admin());
