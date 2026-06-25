-- Winners had a claim_deadline (21 days after the draw) but nothing enforced
-- it: respond_to_win() only blocks a *late* response, so a winner who never
-- responds stays stuck in 'awaiting_claim' forever, and the host can never
-- confirm/withdraw because confirm_prize() only flips winners sitting in
-- 'awaiting_claim' once the host acts, not once the deadline passes.
--
-- Mirrors the existing 7-day host-side guarantee: silence past the deadline
-- is treated as acceptance (the entrant had their window to dispute and
-- didn't), so the host's confirm/withdraw flow is never blocked by a winner
-- who simply never logs back in.
create function private.run_due_winner_claim_expirations()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.winners
    set prize_status = 'accepted', accepted_at = now()
    where prize_status = 'awaiting_claim'
      and claim_deadline is not null
      and claim_deadline <= now();
end;
$$;

select cron.schedule(
  'run-due-winner-claim-expirations',
  '*/15 * * * *',
  $$ select private.run_due_winner_claim_expirations(); $$
);
