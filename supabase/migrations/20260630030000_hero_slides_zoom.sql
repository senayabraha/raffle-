-- Adds a per-slide image zoom factor and makes headline/sub_copy fully
-- optional, matching the admin form (which only requires uploaded media).
alter table public.hero_slides add column if not exists image_zoom float default 1.0;
alter table public.hero_slides alter column headline drop not null;
