-- Host confirms (or revokes) the prize after the draw.
create function public.confirm_prize(p_raffle_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_raffle public.raffles;
  v_gross numeric;
  v_comp numeric;
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;
  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if not found then raise exception 'Raffle not found.'; end if;
  if v_raffle.host_id <> v_uid then
    raise exception 'Only the host can confirm this prize.';
  end if;
  if v_raffle.status <> 'ended' then
    raise exception 'This raffle has not ended yet.';
  end if;

  if p_decision in ('advertised', 'modified') then
    update public.raffles
      set prize_status = 'confirmed', prize_confirmed_at = now()
      where id = p_raffle_id;
    update public.winners
      set prize_status = 'accepted', accepted_at = now()
      where raffle_id = p_raffle_id and prize_status = 'awaiting_claim';
    return jsonb_build_object('prize_status', 'confirmed');

  elsif p_decision = 'revoke' then
    select coalesce(sum(amount_gross), 0) into v_gross
      from public.payments where raffle_id = p_raffle_id;
    v_comp := round(v_gross * 0.75, 2);
    update public.raffles set prize_status = 'revoked' where id = p_raffle_id;
    update public.winners set prize_status = 'compensated' where raffle_id = p_raffle_id;
    update public.payments set status = 'compensated' where raffle_id = p_raffle_id;
    insert into public.payouts (host_id, raffle_id, amount, type, status)
      values (null, p_raffle_id, v_comp, 'winner_compensation', 'processed');
    return jsonb_build_object('prize_status', 'revoked', 'compensation', v_comp);

  else
    raise exception 'Unknown decision: %', p_decision;
  end if;
end;
$$;

-- Host withdraws their net revenue once the prize is confirmed.
create function public.withdraw_revenue(p_raffle_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_raffle public.raffles;
  v_net numeric;
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;
  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if not found then raise exception 'Raffle not found.'; end if;
  if v_raffle.host_id <> v_uid then
    raise exception 'Only the host can withdraw.';
  end if;
  if v_raffle.prize_status <> 'confirmed' then
    raise exception 'Confirm the prize before withdrawing.';
  end if;
  if v_raffle.revenue_released_at is not null then
    raise exception 'Revenue has already been withdrawn.';
  end if;

  select coalesce(sum(host_net), 0) into v_net
    from public.payments where raffle_id = p_raffle_id and status = 'held';
  update public.payments set status = 'released'
    where raffle_id = p_raffle_id and status = 'held';
  insert into public.payouts (host_id, raffle_id, amount, type, status)
    values (v_uid, p_raffle_id, v_net, 'host_revenue', 'processed');
  update public.raffles set revenue_released_at = now() where id = p_raffle_id;
  return jsonb_build_object('amount', v_net);
end;
$$;

revoke execute on function public.confirm_prize(uuid, text) from public, anon;
revoke execute on function public.withdraw_revenue(uuid) from public, anon;
grant execute on function public.confirm_prize(uuid, text) to authenticated;
grant execute on function public.withdraw_revenue(uuid) to authenticated;
