-- ---------- Charities ----------
create table public.charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  registration_number text,
  verified boolean not null default false,
  logo_url text,
  description text,
  created_at timestamptz not null default now()
);

-- ---------- Raffles ----------
create table public.raffles (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  slug text unique not null,
  description text,
  category text,
  status public.raffle_status not null default 'draft',
  visibility public.visibility not null default 'public',
  ticket_price numeric(10, 2) not null default 0,
  ticket_cap integer,
  tickets_sold_count integer not null default 0,
  bundle_rules jsonb not null default '[]'::jsonb,
  draw_type public.draw_type not null default 'date',
  draw_date timestamptz,
  min_ticket_target integer,
  charity_id uuid references public.charities (id) on delete set null,
  charity_percent numeric(5, 2) not null default 0,
  affiliate_percent numeric(5, 2) not null default 0,
  featured_until timestamptz,
  prize_confirmed_at timestamptz,
  prize_status public.prize_status not null default 'pending',
  revenue_released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger raffles_set_updated_at
  before update on public.raffles
  for each row execute function public.set_updated_at();

-- ---------- Payments ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles (id) on delete cascade,
  payer_id uuid references public.profiles (id) on delete set null,
  amount_gross numeric(10, 2) not null,
  platform_commission numeric(10, 2) not null default 0,
  host_net numeric(10, 2) not null default 0,
  affiliate_share numeric(10, 2) not null default 0,
  charity_share numeric(10, 2) not null default 0,
  stripe_payment_id text,
  status public.payment_status not null default 'held',
  created_at timestamptz not null default now()
);

-- ---------- Promo codes ----------
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles (id) on delete cascade,
  code text not null,
  discount_type public.discount_type not null,
  discount_value numeric(10, 2) not null,
  max_uses integer,
  uses_count integer not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (raffle_id, code)
);

-- ---------- Tickets ----------
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles (id) on delete cascade,
  entrant_id uuid references public.profiles (id) on delete set null,
  ticket_number integer not null,
  entry_type public.entry_type not null default 'paid',
  payment_id uuid references public.payments (id) on delete set null,
  promo_code_id uuid references public.promo_codes (id) on delete set null,
  affiliate_id uuid references public.profiles (id) on delete set null,
  geo_region text,
  created_at timestamptz not null default now(),
  unique (raffle_id, ticket_number)
);

-- ---------- Winners ----------
create table public.winners (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles (id) on delete cascade,
  ticket_id uuid references public.tickets (id) on delete set null,
  winner_id uuid references public.profiles (id) on delete set null,
  notified_at timestamptz,
  claim_deadline timestamptz,
  accepted_at timestamptz,
  disputed_at timestamptz,
  prize_status public.winner_prize_status not null default 'awaiting_claim',
  created_at timestamptz not null default now()
);

-- ---------- Payouts ----------
create table public.payouts (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references public.profiles (id) on delete set null,
  raffle_id uuid references public.raffles (id) on delete cascade,
  amount numeric(10, 2) not null,
  type public.payout_type not null,
  stripe_transfer_id text,
  status public.payout_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------- Affiliates ----------
create table public.affiliates (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles (id) on delete cascade,
  affiliate_id uuid not null references public.profiles (id) on delete cascade,
  unique_link text not null unique,
  tickets_sold integer not null default 0,
  commission_earned numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (raffle_id, affiliate_id)
);

-- ---------- Campaigns ----------
create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles (id) on delete cascade,
  raffle_id uuid references public.raffles (id) on delete cascade,
  subject text,
  body_html text,
  recipient_count integer not null default 0,
  sent_at timestamptz,
  status public.campaign_status not null default 'draft',
  created_at timestamptz not null default now()
);

-- ---------- Indexes ----------
create index idx_raffles_host on public.raffles (host_id);
create index idx_raffles_status on public.raffles (status);
create index idx_raffles_visibility on public.raffles (visibility);
create index idx_tickets_raffle on public.tickets (raffle_id);
create index idx_tickets_entrant on public.tickets (entrant_id);
create index idx_payments_raffle on public.payments (raffle_id);
create index idx_payments_payer on public.payments (payer_id);
create index idx_winners_raffle on public.winners (raffle_id);
create index idx_winners_winner on public.winners (winner_id);
create index idx_payouts_host on public.payouts (host_id);
create index idx_promo_codes_raffle on public.promo_codes (raffle_id);
create index idx_affiliates_raffle on public.affiliates (raffle_id);
create index idx_campaigns_host on public.campaigns (host_id);
