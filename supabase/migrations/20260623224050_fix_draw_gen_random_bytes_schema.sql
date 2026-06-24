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
  v_seed := encode(extensions.gen_random_bytes(32), 'hex');

  if v_entries = 0 then
    update public.raffles
      set status = 'ended', draw_date = coalesce(draw_date, now())
      where id = p_raffle_id;
    insert into public.draw_audit (raffle_id, seed, entries)
      values (p_raffle_id, v_seed, 0);
    return;
  end if;

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
