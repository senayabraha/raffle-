-- ---------- Enums ----------
create type public.user_role as enum ('host', 'entrant', 'both', 'admin');
create type public.subscription_tier as enum ('basic', 'premium', 'pro');
create type public.raffle_status as enum ('draft', 'live', 'ended', 'cancelled');
create type public.visibility as enum ('public', 'private');
create type public.draw_type as enum ('date', 'soldout', 'hybrid');
create type public.prize_status as enum ('pending', 'confirmed', 'revoked', 'disputed');
create type public.entry_type as enum ('paid', 'free_share', 'free_bonus', 'affiliate');
create type public.payment_status as enum ('held', 'released', 'refunded', 'compensated');
create type public.winner_prize_status as enum ('awaiting_claim', 'claimed', 'accepted', 'disputed', 'compensated');
create type public.payout_type as enum ('host_revenue', 'charity', 'affiliate', 'winner_compensation');
create type public.payout_status as enum ('pending', 'processed', 'failed');
create type public.discount_type as enum ('percent', 'fixed', 'free_tickets');
create type public.campaign_status as enum ('draft', 'sent', 'scheduled');

-- ---------- Profiles (1:1 with auth.users) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  role public.user_role not null default 'entrant',
  stripe_account_id text,
  stripe_customer_id text,
  subscription_tier public.subscription_tier not null default 'basic',
  trustpilot_score numeric(3, 1),
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Public user profile, one row per auth.users record.';

-- Auto-create a profile whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'entrant')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at maintainer.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
