-- Public viewers could previously SELECT every ticket row (entrant_id,
-- ticket_number) for any public raffle via the "public-raffle viewers"
-- clause. The marketplace UI never needed raw ticket rows for this — sold
-- counts come from the denormalized raffles.tickets_sold_count column —
-- so drop public access and keep only the entrant's own tickets and the
-- raffle host's full view.
drop policy "Entrants, hosts and public-raffle viewers can read tickets" on public.tickets;

create policy "Entrants and hosts can read tickets"
  on public.tickets for select
  using (
    entrant_id = (select auth.uid())
    or private.is_raffle_host(raffle_id)
  );
