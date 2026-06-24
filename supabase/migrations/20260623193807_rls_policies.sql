-- ---------- Helper functions (SECURITY DEFINER to avoid RLS recursion) ----------
create function public.is_raffle_host(rid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.raffles r
    where r.id = rid and r.host_id = auth.uid()
  );
$$;

create function public.is_raffle_public(rid uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.raffles r
    where r.id = rid and r.visibility = 'public'
  );
$$;

-- ---------- Enable RLS everywhere ----------
alter table public.profiles    enable row level security;
alter table public.charities   enable row level security;
alter table public.raffles     enable row level security;
alter table public.payments    enable row level security;
alter table public.promo_codes enable row level security;
alter table public.tickets     enable row level security;
alter table public.winners     enable row level security;
alter table public.payouts     enable row level security;
alter table public.affiliates  enable row level security;
alter table public.campaigns   enable row level security;

-- ---------- Profiles ----------
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------- Charities ----------
create policy "Charities are viewable by everyone"
  on public.charities for select using (true);

-- ---------- Raffles ----------
create policy "Public raffles are viewable by everyone"
  on public.raffles for select using (visibility = 'public' or host_id = (select auth.uid()));
create policy "Hosts can create their own raffles"
  on public.raffles for insert to authenticated with check (host_id = (select auth.uid()));
create policy "Hosts can update their own raffles"
  on public.raffles for update to authenticated using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "Hosts can delete their own raffles"
  on public.raffles for delete to authenticated using (host_id = (select auth.uid()));

-- ---------- Payments ----------
create policy "Payers and raffle hosts can view payments"
  on public.payments for select to authenticated
  using (payer_id = (select auth.uid()) or public.is_raffle_host(raffle_id));
create policy "Payers can create their own payments"
  on public.payments for insert to authenticated with check (payer_id = (select auth.uid()));

-- ---------- Promo codes ----------
create policy "Promo codes visible for public raffles or owning host"
  on public.promo_codes for select
  using (public.is_raffle_public(raffle_id) or public.is_raffle_host(raffle_id));
create policy "Hosts manage promo codes on their raffles"
  on public.promo_codes for all to authenticated
  using (public.is_raffle_host(raffle_id)) with check (public.is_raffle_host(raffle_id));

-- ---------- Tickets ----------
create policy "Entrants, hosts and public-raffle viewers can read tickets"
  on public.tickets for select
  using (
    entrant_id = (select auth.uid())
    or public.is_raffle_host(raffle_id)
    or public.is_raffle_public(raffle_id)
  );
create policy "Entrants can create their own tickets"
  on public.tickets for insert to authenticated with check (entrant_id = (select auth.uid()));

-- ---------- Winners ----------
create policy "Winners, hosts and public-raffle viewers can read winners"
  on public.winners for select
  using (
    winner_id = (select auth.uid())
    or public.is_raffle_host(raffle_id)
    or public.is_raffle_public(raffle_id)
  );
create policy "Winner can update their own claim"
  on public.winners for update to authenticated
  using (winner_id = (select auth.uid())) with check (winner_id = (select auth.uid()));
create policy "Host can update winners on their raffles"
  on public.winners for update to authenticated
  using (public.is_raffle_host(raffle_id)) with check (public.is_raffle_host(raffle_id));

-- ---------- Payouts ----------
create policy "Hosts can view their own payouts"
  on public.payouts for select to authenticated using (host_id = (select auth.uid()));

-- ---------- Affiliates ----------
create policy "Affiliates and hosts can view affiliate rows"
  on public.affiliates for select to authenticated
  using (affiliate_id = (select auth.uid()) or public.is_raffle_host(raffle_id));
create policy "Users can register themselves as affiliates"
  on public.affiliates for insert to authenticated with check (affiliate_id = (select auth.uid()));

-- ---------- Campaigns ----------
create policy "Hosts manage their own campaigns"
  on public.campaigns for all to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
