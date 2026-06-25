-- The "Raffall Guarantee" promises entrants an automatic 75% refund if the
-- host doesn't confirm prize delivery within 7 days of the draw. Until now
-- that compensation only happened if the host manually chose "revoke" in
-- confirm_prize() — there was no automatic enforcement, so the badge's
-- "paid by the platform — automatically" claim wasn't actually true.
--
-- This adds a scheduled function that finds raffles still 'pending'
-- confirmation more than 7 days after their draw and applies the same
-- 75% compensation as a host-initiated revoke, then marks them as such.
create function private.run_due_guarantee_compensations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raffle record;
begin
  for v_raffle in
    select id from public.raffles
    where status = 'ended'
      and prize_status = 'pending'
      and draw_date is not null
      and draw_date + interval '7 days' <= now()
    for update skip locked
  loop
    update public.raffles set prize_status = 'revoked' where id = v_raffle.id;
    update public.winners set prize_status = 'compensated' where raffle_id = v_raffle.id;
    update public.payments set status = 'compensated' where raffle_id = v_raffle.id;
  end loop;
end;
$$;

select cron.schedule(
  'run-due-guarantee-compensations',
  '*/15 * * * *',
  $$ select private.run_due_guarantee_compensations(); $$
);
