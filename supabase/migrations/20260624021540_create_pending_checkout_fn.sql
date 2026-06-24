create or replace function public.create_pending_checkout(
  p_raffle_id uuid,
  p_qty integer,
  p_promo text default null,
  p_provider public.payment_provider default 'chapa',
  p_full_name text default null,
  p_phone text default null,
  p_email text default null,
  p_city text default null
)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
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
begin
  if p_qty < 1 then
    raise exception 'Quantity must be at least 1.';
  end if;
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'Full name is required.';
  end if;
  if p_phone is null or length(trim(p_phone)) = 0 then
    raise exception 'Phone number is required.';
  end if;
  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'Email address is required.';
  end if;
  if p_city is null or length(trim(p_city)) = 0 then
    raise exception 'City is required.';
  end if;

  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if not found then
    raise exception 'Raffle not found.';
  end if;
  if v_raffle.status <> 'live' then
    raise exception 'This raffle is not accepting entries.';
  end if;
  if v_raffle.visibility <> 'public' and v_raffle.host_id <> coalesce(v_uid, '00000000-0000-0000-0000-000000000000'::uuid) then
    raise exception 'This raffle is private.';
  end if;
  if v_raffle.ticket_cap is not null
     and v_raffle.tickets_sold_count + p_qty > v_raffle.ticket_cap then
    raise exception 'Not enough tickets remaining.';
  end if;

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
    end if;
  end if;

  v_gross := greatest(v_gross - v_discount, 0);

  select subscription_tier into v_tier from public.profiles where id = v_raffle.host_id;
  v_rate := case when v_tier = 'basic' then 0.15 else 0.10 end;
  v_commission := round(v_gross * v_rate, 2);
  v_charity := round(v_gross * (v_raffle.charity_percent / 100), 2);
  v_host_net := v_gross - v_commission - v_charity;

  insert into public.payments (
    raffle_id, payer_id, amount_gross, platform_commission, host_net, charity_share,
    status, provider, meta
  ) values (
    p_raffle_id, v_uid, v_gross, v_commission, v_host_net, v_charity,
    'pending', p_provider,
    jsonb_build_object(
      'qty', p_qty, 'free', v_free,
      'promo_code_id', v_promo.id
    )
  ) returning id into v_payment_id;

  insert into public.checkout_contacts (payment_id, full_name, phone, email, city)
  values (v_payment_id, trim(p_full_name), trim(p_phone), trim(p_email), trim(p_city));

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'amount', v_gross,
    'paid', p_qty,
    'free', v_free,
    'currency', 'ETB'
  );
end;
$function$;

grant execute on function public.create_pending_checkout(uuid, integer, text, public.payment_provider, text, text, text, text) to anon, authenticated;
