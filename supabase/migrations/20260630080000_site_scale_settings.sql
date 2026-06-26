-- Site-wide display scale (CSS zoom) applied to all public-facing and host
-- pages, controlled by the admin. Stored as three breakpoint-specific
-- factors on the existing hero_settings single-row config table — no new
-- table or RLS policies needed since "Anyone can view hero settings" /
-- "Admins can update hero settings" already cover public read + admin write.

alter table public.hero_settings add column if not exists scale_mobile float not null default 0.82;
alter table public.hero_settings add column if not exists scale_tablet float not null default 0.85;
alter table public.hero_settings add column if not exists scale_desktop float not null default 0.85;
