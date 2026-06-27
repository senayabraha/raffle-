-- Adds an admin-controllable scroll speed (in seconds per full loop) for the
-- homepage Featured Raffles carousel animation.

alter table public.featured_settings
  add column scroll_duration_seconds float not null default 20.0;
