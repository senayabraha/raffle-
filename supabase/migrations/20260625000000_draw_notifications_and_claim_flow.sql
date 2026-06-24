-- ---------- Entrant claim flow ----------
-- Winners previously had an open self-update RLS policy with no column
-- restriction, letting a client set prize_status to anything (including
-- 'compensated'). Replace it with a SECURITY DEFINER RPC that only allows
-- the documented accept/dispute transitions from 'awaiting_claim', before
-- the claim deadline.
drop policy if exists "Winner can update their own claim" on public.winners;

create function public.respond_to_win(p_winner_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_winner public.winners;
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;
  select * into v_winner from public.winners where id = p_winner_id for update;
  if not found then
    raise exception 'Winning record not found.';
  end if;
  if v_winner.winner_id <> v_uid then
    raise exception 'This prize is not yours to respond to.';
  end if;
  if v_winner.prize_status <> 'awaiting_claim' then
    raise exception 'This prize has already been responded to.';
  end if;
  if v_winner.claim_deadline is not null and v_winner.claim_deadline < now() then
    raise exception 'The claim deadline has passed.';
  end if;

  if p_decision = 'accept' then
    update public.winners set prize_status = 'accepted', accepted_at = now()
      where id = p_winner_id;
    return jsonb_build_object('prize_status', 'accepted');
  elsif p_decision = 'dispute' then
    update public.winners set prize_status = 'disputed', disputed_at = now()
      where id = p_winner_id;
    update public.raffles set prize_status = 'disputed' where id = v_winner.raffle_id;
    return jsonb_build_object('prize_status', 'disputed');
  else
    raise exception 'Unknown decision: %', p_decision;
  end if;
end;
$$;

revoke execute on function public.respond_to_win(uuid, text) from public, anon;
grant execute on function public.respond_to_win(uuid, text) to authenticated;

-- ---------- Draw notifications ----------
-- Lets private.draw_raffle() asynchronously call the notify-draw Edge
-- Function (entrant winner email + host email) via pg_net, without baking
-- secrets into migrations. Populate this table once per project, e.g.:
--   insert into private.app_config (key, value) values
--     ('functions_base_url', 'https://<project-ref>.functions.supabase.co'),
--     ('service_role_key', '<service-role-key>');
create extension if not exists pg_net;

create table private.app_config (
  key text primary key,
  value text not null
);

create function private.notify_draw(p_raffle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
begin
  select value into v_url from private.app_config where key = 'functions_base_url';
  select value into v_key from private.app_config where key = 'service_role_key';
  if v_url is null or v_key is null then
    return;
  end if;

  perform net.http_post(
    url := v_url || '/notify-draw',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := jsonb_build_object('raffle_id', p_raffle_id)
  );
end;
$$;

-- Re-create draw_raffle to fire the notification once the draw (winner or
-- no-entries case) has been committed.
create or replace function private.draw_raffle(p_raffle_id uuid)
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
    perform private.notify_draw(p_raffle_id);
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

  perform private.notify_draw(p_raffle_id);
end;
$$;
