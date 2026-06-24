-- Removes promo codes, the email campaign builder, and the featured-listing
-- boost — none of these had a real host-facing flow: promo codes could only
-- ever be applied at checkout (no host UI to create one), campaigns had a
-- table with zero UI anywhere, and "featured" was a free toggle with no
-- payment behind the advertised fee.

-- ---------- Purchase/checkout RPCs: drop the promo-code parameter ----------
drop function if exists public.purchase_tickets(uuid, integer, text);

create function public.purchase_tickets(
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

revoke execute on function public.purchase_tickets(uuid, integer) from public, anon;
grant execute on function public.purchase_tickets(uuid, integer) to authenticated;

drop function if exists public.create_pending_checkout(
  uuid, integer, text, public.payment_provider, text, text, text, text
);

create function public.create_pending_checkout(
  p_raffle_id uuid,
  p_qty integer,
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
  v_free integer := 0;
  v_bundle jsonb;
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
    jsonb_build_object('qty', p_qty, 'free', v_free)
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

grant execute on function public.create_pending_checkout(
  uuid, integer, public.payment_provider, text, text, text, text
) to anon, authenticated;

-- ---------- finalize_checkout: stop touching promo_code_id ----------
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
    set tickets_sold_count = tickets_sold_count + v_total
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

-- ---------- Drop promo codes ----------
alter table public.tickets drop column if exists promo_code_id;
drop table if exists public.promo_codes;
drop type if exists public.discount_type;

-- ---------- Drop email campaign builder ----------
drop table if exists public.campaigns;
drop type if exists public.campaign_status;

-- ---------- Drop featured-listing boost ----------
alter table public.raffles drop column if exists featured_until;
