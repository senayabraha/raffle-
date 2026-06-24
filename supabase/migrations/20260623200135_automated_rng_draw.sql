create extension if not exists pgcrypto;

-- ---------- Draw audit log (dispute evidence) ----------
create table public.draw_audit (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles (id) on delete cascade,
  method text not null default 'CSPRNG (pgcrypto gen_random_bytes)',
  seed text not null,
  entries integer not null,
  drawn_index integer,
  drawn_ticket_number integer,
  winner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_draw_audit_raffle on public.draw_audit (raffle_id);

alter table public.draw_audit enable row level security;
create policy "Draw audit visible for public raffles or owning host"
  on public.draw_audit for select
  using (private.is_raffle_public(raffle_id) or private.is_raffle_host(raffle_id));

-- ---------- Single-raffle draw ----------
-- Picks a winner using a cryptographic seed; fully automated and logged so the
-- outcome is auditable and cannot be influenced by the host.
create function private.draw_raffle(p_raffle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raffle public.raffles;
  v_entries integer;
  v_seed text;
  v_index integer;
  v_ticket public.tickets;
begin
  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if not found or v_raffle.status <> 'live' then
    return;
  end if;

  select count(*) into v_entries from public.tickets where raffle_id = p_raffle_id;
  v_seed := encode(gen_random_bytes(32), 'hex');

  if v_entries = 0 then
    update public.raffles
      set status = 'ended', draw_date = coalesce(draw_date, now())
      where id = p_raffle_id;
    insert into public.draw_audit (raffle_id, seed, entries)
      values (p_raffle_id, v_seed, 0);
    return;
  end if;

  -- Deterministic winning index derived from the seed.
  v_index := (('x' || substr(md5(v_seed), 1, 15))::bit(60)::bigint % v_entries)::integer;

  select * into v_ticket
    from public.tickets
    where raffle_id = p_raffle_id
    order by ticket_number
    offset v_index limit 1;

  insert into public.winners (
    raffle_id, ticket_id, winner_id, notified_at, claim_deadline, prize_status
  ) values (
    p_raffle_id, v_ticket.id, v_ticket.entrant_id, now(),
    now() + interval '21 days', 'awaiting_claim'
  );

  update public.raffles
    set status = 'ended', draw_date = coalesce(draw_date, now())
    where id = p_raffle_id;

  insert into public.draw_audit (
    raffle_id, seed, entries, drawn_index, drawn_ticket_number, winner_id
  ) values (
    p_raffle_id, v_seed, v_entries, v_index, v_ticket.ticket_number, v_ticket.entrant_id
  );
end;
$$;

-- ---------- Sweep all due raffles ----------
-- A raffle is due when its draw date has passed, or it has sold out.
create function private.run_due_draws()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
  n integer := 0;
begin
  for r in
    select id from public.raffles
    where status = 'live'
      and (
        (draw_type in ('date', 'hybrid') and draw_date is not null and draw_date <= now())
        or (ticket_cap is not null and tickets_sold_count >= ticket_cap)
      )
  loop
    perform private.draw_raffle(r.id);
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- ---------- Schedule the sweep every minute ----------
create extension if not exists pg_cron;
select cron.schedule('run-due-draws', '* * * * *', $$ select private.run_due_draws(); $$);
