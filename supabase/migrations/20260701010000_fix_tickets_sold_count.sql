-- Fix: tickets_sold_count must only count paid tickets.
-- Free bonus tickets (entry_type = 'free_bonus') are issued sequential ticket
-- numbers and enter the draw with equal winning chance, but they do not consume
-- a cap slot and must not inflate the sold count.
-- Both purchase_tickets and finalize_checkout previously incremented by
-- v_total (paid + free). Corrected to increment by paid quantity only.
-- The draw (private.draw_raffle) is unchanged — it picks from all tickets
-- with no entry_type filter, which is correct and intentional.

create or replace function public.purchase_tickets(
  p_raffle_id uuid,
  p_qty integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_raffle public.raffles;
  v_tier public.subscription_tier;
  v_rate numeric;
  v_gross numeric;
  v_free integer := 0;
  v_bundle jsonb;
  v_commission numeric;
  v_host_net numeric;
  v_payment_id uuid;
  v_start integer;
  v_total integer;
  i integer;
begin
  if v_uid is null then
    raise exception 'You must be signed in to enter.' using errcode = '28000';
  end if;
  if p_qty < 1 then
    raise exception 'Quantity must be at least 1.';
  end if;

  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if not found then
    raise exception 'Raffle not found.';
  end if;
  if v_raffle.status <> 'live' then
    raise exception 'This raffle is not accepting entries.';
  end if;
  if v_raffle.suspension_status <> 'active' then
    raise exception 'This raffle is not accepting entries.';
  end if;
  if v_raffle.visibility <> 'public' and v_raffle.host_id <> v_uid then
    raise exception 'This raffle is private.';
  end if;
  if v_raffle.ticket_cap is not null
     and v_raffle.tickets_sold_count + p_qty > v_raffle.ticket_cap then
    raise exception 'Not enough tickets remaining.';
  end if;

  -- Best matching bundle of free tickets.
  for v_bundle in
    select * from jsonb_array_elements(coalesce(v_raffle.bundle_rules, '[]'::jsonb))
  loop
    if (v_bundle->>'buy') is not null and p_qty >= (v_bundle->>'buy')::int then
      v_free := greatest(
        v_free,
        (p_qty / (v_bundle->>'buy')::int) * (v_bundle->>'free')::int
      );
    end if;
  end loop;

  v_gross := v_raffle.ticket_price * p_qty;

  -- Commission depends on the host's subscription tier.
  select subscription_tier into v_tier from public.profiles where id = v_raffle.host_id;
  v_rate := case when v_tier = 'basic' then 0.15 else 0.10 end;
  v_commission := round(v_gross * v_rate, 2);
  v_host_net := v_gross - v_commission;

  insert into public.payments (
    raffle_id, payer_id, amount_gross, platform_commission, host_net, status
  ) values (
    p_raffle_id, v_uid, v_gross, v_commission, v_host_net, 'held'
  ) returning id into v_payment_id;

  select coalesce(max(ticket_number), 0) into v_start
    from public.tickets where raffle_id = p_raffle_id;
  v_total := p_qty + v_free;

  for i in 1..v_total loop
    insert into public.tickets (raffle_id, entrant_id, ticket_number, entry_type, payment_id)
    values (
      p_raffle_id, v_uid, v_start + i,
      case when i <= p_qty then 'paid'::public.entry_type
           else 'free_bonus'::public.entry_type end,
      case when i <= p_qty then v_payment_id else null end
    );
  end loop;

  update public.raffles
    set tickets_sold_count = tickets_sold_count + p_qty  -- paid tickets only
    where id = p_raffle_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'paid', p_qty,
    'free', v_free,
    'total', v_total,
    'amount', v_gross,
    'first_ticket', v_start + 1,
    'last_ticket', v_start + v_total
  );
end;
$$;

revoke execute on function public.purchase_tickets(uuid, integer) from public, anon;
grant execute on function public.purchase_tickets(uuid, integer) to authenticated;

create or replace function public.finalize_checkout(
  p_payment_id uuid,
  p_provider_ref text
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_payment public.payments;
  v_qty integer;
  v_free integer;
  v_total integer;
  v_start integer;
  v_uid uuid;
  i integer;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;

  -- Idempotent: webhooks can retry/duplicate-deliver.
  if v_payment.status <> 'pending' then
    return jsonb_build_object(
      'payment_id', v_payment.id,
      'status', v_payment.status,
      'already_finalized', true
    );
  end if;

  v_qty := (v_payment.meta->>'qty')::int;
  v_free := coalesce((v_payment.meta->>'free')::int, 0);
  v_uid := v_payment.payer_id;

  select coalesce(max(ticket_number), 0) into v_start
    from public.tickets where raffle_id = v_payment.raffle_id;
  v_total := v_qty + v_free;

  for i in 1..v_total loop
    insert into public.tickets (raffle_id, entrant_id, ticket_number, entry_type, payment_id)
    values (
      v_payment.raffle_id, v_uid, v_start + i,
      case when i <= v_qty then 'paid'::public.entry_type
           else 'free_bonus'::public.entry_type end,
      case when i <= v_qty then v_payment.id else null end
    );
  end loop;

  update public.raffles
    set tickets_sold_count = tickets_sold_count + v_qty  -- paid tickets only
    where id = v_payment.raffle_id;

  update public.payments
    set status = 'held', provider_ref = p_provider_ref
    where id = p_payment_id;

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'status', 'held',
    'paid', v_qty,
    'free', v_free,
    'total', v_total,
    'amount', v_payment.amount_gross,
    'first_ticket', v_start + 1,
    'last_ticket', v_start + v_total,
    'raffle_id', v_payment.raffle_id,
    'already_finalized', false
  );
end;
$function$;

-- Backfill: recompute tickets_sold_count for all live raffles from ground truth.
-- Uses the tickets table directly, counting only entry_type = 'paid'.
-- Only touches live raffles (status = 'live') since ended/cancelled raffles
-- are historical records — their counts no longer affect cap or draw logic.
UPDATE public.raffles r
SET tickets_sold_count = (
  SELECT COUNT(*)
  FROM public.tickets t
  WHERE t.raffle_id = r.id
    AND t.entry_type = 'paid'
)
WHERE r.status = 'live';
