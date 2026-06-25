-- Admin panel, phase 2: resolve a disputed prize.
--
-- respond_to_win() lets an entrant move a win into 'disputed', but nothing
-- has ever moved it back out — raffles.prize_status/winners.prize_status
-- both land on 'disputed' and stay there forever. This adds the one
-- function that closes that loop, mirroring the two terminal states the
-- automated guarantee-compensation cron already uses for the same
-- raffle/winner/payment triple (private.run_due_guarantee_compensations in
-- 20260625040000_automated_guarantee_compensation.sql):
--   - uphold_entrant -> winners 'compensated', raffles 'revoked',
--     payments 'compensated' (same effect as the host missing the
--     7-day confirmation window)
--   - uphold_host -> winners 'accepted', raffles 'confirmed' (same effect
--     as confirm_prize())
create function public.admin_resolve_dispute(
  p_winner_id uuid,
  p_decision text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_winner public.winners;
begin
  if not private.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_decision not in ('uphold_entrant', 'uphold_host') then
    raise exception 'Unknown decision: %', p_decision;
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to resolve a dispute.';
  end if;

  select * into v_winner from public.winners where id = p_winner_id for update;
  if not found then
    raise exception 'Winning record not found.';
  end if;
  if v_winner.prize_status <> 'disputed' then
    raise exception 'This prize is not currently disputed.';
  end if;

  if p_decision = 'uphold_entrant' then
    update public.winners set prize_status = 'compensated' where id = p_winner_id;
    update public.raffles set prize_status = 'revoked' where id = v_winner.raffle_id;
    update public.payments set status = 'compensated' where raffle_id = v_winner.raffle_id;
  else
    update public.winners set prize_status = 'accepted', accepted_at = now()
      where id = p_winner_id;
    update public.raffles set prize_status = 'confirmed', prize_confirmed_at = now()
      where id = v_winner.raffle_id;
  end if;

  perform private.log_admin_action(
    'resolve_dispute', 'winners', p_winner_id, p_reason,
    jsonb_build_object('decision', p_decision, 'raffle_id', v_winner.raffle_id)
  );

  return jsonb_build_object(
    'prize_status', case when p_decision = 'uphold_entrant' then 'compensated' else 'accepted' end
  );
end;
$$;

revoke execute on function public.admin_resolve_dispute(uuid, text, text) from public, anon;
grant execute on function public.admin_resolve_dispute(uuid, text, text) to authenticated;
