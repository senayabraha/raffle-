-- Move RLS helper functions into a private (non-API-exposed) schema so they
-- can't be called as RPC endpoints, while still being usable inside policies.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- Drop policies that depend on the public helper functions.
drop policy "Payers and raffle hosts can view payments" on public.payments;
drop policy "Promo codes visible for public raffles or owning host" on public.promo_codes;
drop policy "Hosts manage promo codes on their raffles" on public.promo_codes;
drop policy "Entrants, hosts and public-raffle viewers can read tickets" on public.tickets;
drop policy "Winners, hosts and public-raffle viewers can read winners" on public.winners;
drop policy "Host can update winners on their raffles" on public.winners;
drop policy "Affiliates and hosts can view affiliate rows" on public.affiliates;

drop function public.is_raffle_host(uuid);
drop function public.is_raffle_public(uuid);

-- Recreate helpers in the private schema.
create function private.is_raffle_host(rid uuid)
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

create function private.is_raffle_public(rid uuid)
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

-- Recreate the policies against the private helpers.
create policy "Payers and raffle hosts can view payments"
  on public.payments for select to authenticated
  using (payer_id = (select auth.uid()) or private.is_raffle_host(raffle_id));

create policy "Promo codes visible for public raffles or owning host"
  on public.promo_codes for select
  using (private.is_raffle_public(raffle_id) or private.is_raffle_host(raffle_id));
create policy "Hosts manage promo codes on their raffles"
  on public.promo_codes for all to authenticated
  using (private.is_raffle_host(raffle_id)) with check (private.is_raffle_host(raffle_id));

create policy "Entrants, hosts and public-raffle viewers can read tickets"
  on public.tickets for select
  using (
    entrant_id = (select auth.uid())
    or private.is_raffle_host(raffle_id)
    or private.is_raffle_public(raffle_id)
  );

create policy "Winners, hosts and public-raffle viewers can read winners"
  on public.winners for select
  using (
    winner_id = (select auth.uid())
    or private.is_raffle_host(raffle_id)
    or private.is_raffle_public(raffle_id)
  );
create policy "Host can update winners on their raffles"
  on public.winners for update to authenticated
  using (private.is_raffle_host(raffle_id)) with check (private.is_raffle_host(raffle_id));

create policy "Affiliates and hosts can view affiliate rows"
  on public.affiliates for select to authenticated
  using (affiliate_id = (select auth.uid()) or private.is_raffle_host(raffle_id));

-- Harden remaining functions.
alter function public.set_updated_at() set search_path = '';
revoke execute on function public.handle_new_user() from public, anon, authenticated;
