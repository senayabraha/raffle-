-- Removes the affiliate commission, charity split, and payout/withdrawal
-- subsystem. None of it ever executed a real transfer: affiliate_id/
-- affiliate_share were never populated, charity_share was never paid out,
-- and payouts rows (host withdrawal + winner compensation) only ever
-- recorded a ledger entry with no Stripe transfer behind it. The host
-- "confirm prize delivered" flow is unrelated and stays intact.

-- ---------- Prize confirmation: drop the revoke/compensation branch ----------
create or replace function public.confirm_prize(p_raffle_id uuid, p_decision text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_raffle public.raffles;
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
  if p_decision not in ('advertised', 'modified') then
    raise exception 'Unknown decision: %', p_decision;
  end if;

  update public.raffles
    set prize_status = 'confirmed', prize_confirmed_at = now()
    where id = p_raffle_id;
  update public.winners
    set prize_status = 'accepted', accepted_at = now()
    where raffle_id = p_raffle_id and prize_status = 'awaiting_claim';
  return jsonb_build_object('prize_status', 'confirmed');
end;
$$;

-- ---------- Purchase/checkout RPCs: stop computing a charity split ----------
create or replace function public.purchase_tickets(
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
  v_host_net := v_gross - v_commission;

  insert into public.payments (
    raffle_id, payer_id, amount_gross, platform_commission, host_net,
    status, provider, meta
  ) values (
    p_raffle_id, v_uid, v_gross, v_commission, v_host_net,
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

-- ---------- Drop withdrawal RPC ----------
drop function if exists public.withdraw_revenue(uuid);

-- ---------- Drop payout/affiliate/charity tables ----------
drop table if exists public.payouts;
drop table if exists public.affiliates;

alter table public.raffles
  drop column if exists charity_id,
  drop column if exists charity_percent,
  drop column if exists affiliate_percent,
  drop column if exists revenue_released_at;

drop table if exists public.charities;

alter table public.payments
  drop column if exists affiliate_share,
  drop column if exists charity_share;

alter table public.tickets
  drop column if exists affiliate_id;

alter table public.profiles
  drop column if exists stripe_account_id;

drop type if exists public.payout_type;
drop type if exists public.payout_status;
