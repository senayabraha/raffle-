-- Atomic ticket purchase: validates the raffle, applies bundles + promo,
-- records a split payment, allocates sequential ticket numbers, and bumps the
-- sold counter. SECURITY DEFINER so it can update the raffle counter safely;
-- it always acts as the calling (authenticated) user via auth.uid().
create function public.purchase_tickets(
  p_raffle_id uuid,
  p_qty integer,
  p_promo text default null
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
  v_discount numeric := 0;
  v_free integer := 0;
  v_bundle jsonb;
  v_promo public.promo_codes;
  v_commission numeric;
  v_charity numeric;
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

  -- Promo code.
  if p_promo is not null and length(trim(p_promo)) > 0 then
    select * into v_promo from public.promo_codes
      where raffle_id = p_raffle_id and upper(code) = upper(trim(p_promo))
        and (expires_at is null or expires_at > now())
        and (max_uses is null or uses_count < max_uses)
      limit 1;
    if found then
      if v_promo.discount_type = 'percent' then
        v_discount := v_gross * (v_promo.discount_value / 100);
      elsif v_promo.discount_type = 'fixed' then
        v_discount := least(v_promo.discount_value, v_gross);
      elsif v_promo.discount_type = 'free_tickets' then
        v_free := v_free + v_promo.discount_value::int;
      end if;
      update public.promo_codes set uses_count = uses_count + 1 where id = v_promo.id;
    end if;
  end if;

  v_gross := greatest(v_gross - v_discount, 0);

  -- Commission depends on the host's subscription tier.
  select subscription_tier into v_tier from public.profiles where id = v_raffle.host_id;
  v_rate := case when v_tier = 'basic' then 0.15 else 0.10 end;
  v_commission := round(v_gross * v_rate, 2);
  v_charity := round(v_gross * (v_raffle.charity_percent / 100), 2);
  v_host_net := v_gross - v_commission - v_charity;

  insert into public.payments (
    raffle_id, payer_id, amount_gross, platform_commission, host_net, charity_share, status
  ) values (
    p_raffle_id, v_uid, v_gross, v_commission, v_host_net, v_charity, 'held'
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
    set tickets_sold_count = tickets_sold_count + v_total
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

revoke execute on function public.purchase_tickets(uuid, integer, text) from public, anon;
grant execute on function public.purchase_tickets(uuid, integer, text) to authenticated;
