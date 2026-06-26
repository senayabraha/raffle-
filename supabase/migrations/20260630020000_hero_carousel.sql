-- CMS-powered homepage hero carousel: up to 5 admin-managed slides (image or
-- video) plus a single-row settings table for rotation/transition config.
-- Reuses the existing private.is_admin() helper from admin_foundation — no
-- new admin-check logic.

create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  "order" int not null,
  headline text not null,
  sub_copy text,
  media_type text check (media_type in ('image', 'video')),
  media_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.hero_settings (
  id int primary key default 1,
  transition_direction text not null check (transition_direction in ('horizontal', 'vertical')) default 'horizontal',
  rotation_interval_ms int not null default 1500
);

insert into public.hero_settings (id) values (1);

alter table public.hero_slides enable row level security;
alter table public.hero_settings enable row level security;

-- ---------- hero_slides policies ----------
create policy "Anyone can view active hero slides"
  on public.hero_slides for select
  using (is_active = true);

create policy "Admins can view all hero slides"
  on public.hero_slides for select
  using (private.is_admin());

create policy "Admins can insert hero slides"
  on public.hero_slides for insert
  with check (private.is_admin());

create policy "Admins can update hero slides"
  on public.hero_slides for update
  using (private.is_admin());

create policy "Admins can delete hero slides"
  on public.hero_slides for delete
  using (private.is_admin());

-- ---------- hero_settings policies ----------
create policy "Anyone can view hero settings"
  on public.hero_settings for select
  using (true);

create policy "Admins can update hero settings"
  on public.hero_settings for update
  using (private.is_admin());

-- ---------- hero-media storage bucket ----------
insert into storage.buckets (id, name, public)
values ('hero-media', 'hero-media', true);

create policy "Public read access to hero media"
  on storage.objects for select
  to public
  using (bucket_id = 'hero-media');

create policy "Admins can upload hero media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'hero-media' and private.is_admin());

create policy "Admins can update hero media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'hero-media' and private.is_admin());

create policy "Admins can delete hero media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'hero-media' and private.is_admin());
