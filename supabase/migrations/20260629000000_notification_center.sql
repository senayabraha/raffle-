-- Phase 4.1 of the host dashboard: an in-app notification center.
-- New `notifications` table, written to by the existing draw/claim/guarantee
-- functions (appending INSERT calls rather than restructuring them), plus a
-- narrow RLS policy so each user only ever sees their own rows.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  raffle_id uuid references public.raffles(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

create policy "Users can view their own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can mark their own notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Draw notifications: notify host + winner once a draw lands ----------
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
    insert into public.notifications (user_id, type, title, body, raffle_id)
      values (
        v_raffle.host_id, 'raffle_ended', 'Raffle ended with no entries',
        '"' || v_raffle.title || '" closed with no tickets sold.', p_raffle_id
      );
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

  insert into public.notifications (user_id, type, title, body, raffle_id)
    values (
      v_raffle.host_id, 'raffle_drawn', 'Winner drawn',
      '"' || v_raffle.title || '" has been drawn — a winner has been notified.', p_raffle_id
    );
  insert into public.notifications (user_id, type, title, body, raffle_id)
    values (
      v_ticket.entrant_id, 'raffle_won', 'You won!',
      'You won "' || v_raffle.title || '". Respond before the claim deadline.', p_raffle_id
    );

  perform private.notify_draw(p_raffle_id);
end;
$$;

-- ---------- Claim flow: notify host when a winner disputes ----------
create or replace function public.respond_to_win(p_winner_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_winner public.winners;
  v_raffle public.raffles;
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
    select * into v_raffle from public.raffles where id = v_winner.raffle_id;
    insert into public.notifications (user_id, type, title, body, raffle_id)
      values (
        v_raffle.host_id, 'winner_disputed', 'Winner disputed prize delivery',
        'The winner of "' || v_raffle.title || '" has disputed the prize.', v_raffle.id
      );
    return jsonb_build_object('prize_status', 'disputed');
  else
    raise exception 'Unknown decision: %', p_decision;
  end if;
end;
$$;

-- ---------- Automated guarantee compensation: notify host + winner ----------
create or replace function private.run_due_guarantee_compensations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raffle record;
  v_winner_id uuid;
begin
  for v_raffle in
    select id, title, host_id from public.raffles
    where status = 'ended'
      and prize_status = 'pending'
      and draw_date is not null
      and draw_date + interval '7 days' <= now()
    for update skip locked
  loop
    update public.raffles set prize_status = 'revoked' where id = v_raffle.id;
    update public.winners set prize_status = 'compensated' where raffle_id = v_raffle.id;
    update public.payments set status = 'compensated' where raffle_id = v_raffle.id;

    select winner_id into v_winner_id from public.winners where raffle_id = v_raffle.id limit 1;

    insert into public.notifications (user_id, type, title, body, raffle_id)
      values (
        v_raffle.host_id, 'guarantee_triggered', 'Raffle Guarantee triggered',
        'Prize delivery for "' || v_raffle.title || '" wasn''t confirmed in time, so entrants were automatically compensated.',
        v_raffle.id
      );
    if v_winner_id is not null then
      insert into public.notifications (user_id, type, title, body, raffle_id)
        values (
          v_winner_id, 'guarantee_compensated', 'You were compensated',
          'The host of "' || v_raffle.title || '" didn''t confirm delivery in time, so you were automatically refunded under the Raffall Guarantee.',
          v_raffle.id
        );
    end if;
  end loop;
end;
$$;
