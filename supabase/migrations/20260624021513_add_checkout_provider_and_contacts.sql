create type public.payment_provider as enum ('chapa', 'telebirr');

alter table public.payments
  add column provider public.payment_provider,
  add column provider_ref text,
  add column meta jsonb not null default '{}'::jsonb;

alter table public.payments
  alter column amount_gross drop not null;

create table public.checkout_contacts (
  payment_id uuid primary key references public.payments(id) on delete cascade,
  full_name text not null,
  phone text not null,
  email text not null,
  city text not null,
  created_at timestamptz not null default now()
);

alter table public.checkout_contacts enable row level security;

comment on table public.checkout_contacts is 'Contact details collected at checkout time, including for guest (no-account) entrants.';
