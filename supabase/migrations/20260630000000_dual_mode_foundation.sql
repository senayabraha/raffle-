-- Dual-mode (Entrant / Host) foundation.
--
-- 1. Durable per-account active mode. Until now "which app shell am I in"
--    lived only in the browser (localStorage loginContext), so it didn't
--    survive a new device or a fresh sign-in. This column makes it durable.
-- 2. Self-entry guard: a host could buy tickets in their own raffle. Block it
--    at the only two purchase entry points.
-- 3. Tighten the raffles INSERT policy so only host-capable accounts can
--    create raffles (previously any authenticated user could).
-- 4. handle_new_user now seeds last_active_mode to match the sign-up role.

-- ---------- 1. last_active_mode column ----------
alter table public.profiles
  add column last_active_mode text not null default 'entrant'
  check (last_active_mode in ('entrant', 'host'));

-- Backfill: existing host-capable accounts should open in host mode.
update public.profiles
  set last_active_mode = 'host'
  where role in ('host', 'both', 'admin');

-- ---------- 2. Drop the unused trustpilot_score column ----------
-- No integration writes it and no UI reads it; it was dead weight.
alter table public.profiles drop column if exists trustpilot_score;

-- ---------- 3. Self-entry guard + recreate purchase_tickets ----------
-- Recreated verbatim from 20260625020000_remove_promo_campaigns_featured.sql
-- with a single added guard: a host may not enter their own raffle.
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
  if v_raffle.host_id = v_uid then
    raise exception 'Hosts cannot enter their own raffle.';
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

-- ---------- create_pending_checkout: add the same guard ----------
-- Recreated from 20260625050000_age_verification.sql (current signature,
-- includes date_of_birth) with the host self-entry guard added. Note the
-- guard only fires for authenticated hosts; guest checkout (v_uid null) is
-- unaffected.
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
  if v_uid is not null and v_raffle.host_id = v_uid then
    raise exception 'Hosts cannot enter their own raffle.';
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

-- ---------- 4. Tighten raffles INSERT policy ----------
-- Previously any authenticated user could insert a raffle row as long as
-- host_id matched their uid. Require a host-capable role.
drop policy if exists "Hosts can create their own raffles" on public.raffles;
create policy "Hosts can create their own raffles"
  on public.raffles for insert to authenticated
  with check (
    host_id = (select auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('host', 'both', 'admin')
    )
  );

-- ---------- 5. handle_new_user: seed last_active_mode from role ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role :=
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'entrant');
begin
  insert into public.profiles (
    id, email, full_name, avatar_url, role, date_of_birth, last_active_mode
  )
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    v_role,
    (new.raw_user_meta_data ->> 'date_of_birth')::date,
    case when v_role in ('host', 'both', 'admin') then 'host' else 'entrant' end
  );
  return new;
end;
$$;
