-- The only age check in the app was a self-attestation checkbox at
-- registration that wasn't even persisted, and guest checkout had no age
-- gate at all. This adds real date-of-birth capture with a hard
-- server-side >=18 check enforced at the point of ticket purchase, which
-- covers both registered users and guests since create_pending_checkout
-- is the single entry point for all ticket purchases.

alter table public.profiles
  add column date_of_birth date;

alter table public.profiles
  add constraint profiles_date_of_birth_adult
  check (date_of_birth is null or date_of_birth <= (current_date - interval '18 years')::date);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, role, date_of_birth)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'entrant'),
    (new.raw_user_meta_data ->> 'date_of_birth')::date
  );
  return new;
end;
$$;

alter table public.checkout_contacts
  add column date_of_birth date;

alter table public.checkout_contacts
  alter column date_of_birth set not null;

alter table public.checkout_contacts
  add constraint checkout_contacts_date_of_birth_adult
  check (date_of_birth <= (current_date - interval '18 years')::date);

create or replace function public.create_pending_checkout(
  p_raffle_id uuid,
  p_qty integer,
  p_provider public.payment_provider default 'chapa',
  p_full_name text default null,
  p_phone text default null,
  p_email text default null,
  p_city text default null,
  p_date_of_birth date default null
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
  if p_date_of_birth is null then
    raise exception 'Date of birth is required.';
  end if;
  if p_date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'You must be 18 or older to enter a raffle.';
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

  insert into public.checkout_contacts (payment_id, full_name, phone, email, city, date_of_birth)
  values (v_payment_id, trim(p_full_name), trim(p_phone), trim(p_email), trim(p_city), p_date_of_birth);

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'amount', v_gross,
    'paid', p_qty,
    'free', v_free,
    'currency', 'ETB'
  );
end;
$function$;

revoke execute on function public.create_pending_checkout(uuid, integer, public.payment_provider, text, text, text, text) from anon, authenticated;
drop function if exists public.create_pending_checkout(uuid, integer, public.payment_provider, text, text, text, text);

grant execute on function public.create_pending_checkout(uuid, integer, public.payment_provider, text, text, text, text, date) to anon, authenticated;
