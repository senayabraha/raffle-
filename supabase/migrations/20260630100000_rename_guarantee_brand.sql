-- Rebrand: the platform guarantee notifications now reference the
-- product's current name (እድል44) instead of the old placeholder "Raffall".
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
        v_raffle.host_id, 'guarantee_triggered', 'እድል44 Guarantee triggered',
        'Prize delivery for "' || v_raffle.title || '" wasn''t confirmed in time, so entrants were automatically compensated.',
        v_raffle.id
      );
    if v_winner_id is not null then
      insert into public.notifications (user_id, type, title, body, raffle_id)
        values (
          v_winner_id, 'guarantee_compensated', 'You were compensated',
          'The host of "' || v_raffle.title || '" didn''t confirm delivery in time, so you were automatically refunded under the እድል44 Guarantee.',
          v_raffle.id
        );
    end if;
  end loop;
end;
$$;
