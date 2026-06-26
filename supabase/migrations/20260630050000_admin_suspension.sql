-- Admin panel, phase 4: temporary/permanent suspension for raffles and
-- hosts, plus draw-date extensions. Builds on phase 3's moderation RPCs
-- (admin_set_raffle_status / admin_set_user_status) rather than replacing
-- them — `suspension_status` is a standing flag layered on top of the
-- existing `status` lifecycle, the same way `profiles.status` already is.
-- Every mutation here still goes through private.log_admin_action().

alter table public.raffles
  add column suspension_status text not null default 'active'
    check (suspension_status in ('active', 'temporary', 'permanent')),
  add column suspended_at timestamptz,
  add column suspended_until timestamptz,
  add column draw_date_extended_at timestamptz;

alter table public.profiles
  add column suspension_type text
    check (suspension_type in ('temporary', 'permanent')),
  add column suspension_ends_at timestamptz;

-- ---------- Raffle suspension ----------
create function public.admin_suspend_raffle(
  p_raffle_id uuid,
  p_type text,
  p_reason text,
  p_until timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raffle public.raffles;
begin
  if not private.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to suspend a raffle.';
  end if;
  if p_type not in ('temporary', 'permanent') then
    raise exception 'Unknown suspension type: %', p_type;
  end if;
  if p_type = 'temporary' and p_until is null then
    raise exception 'An end date is required for a temporary suspension.';
  end if;

  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if not found then
    raise exception 'Raffle not found.';
  end if;
  if v_raffle.suspension_status <> 'active' then
    raise exception 'This raffle is already suspended.';
  end if;

  update public.raffles set
    suspension_status = p_type,
    suspended_at = now(),
    suspended_until = case when p_type = 'temporary' then p_until else null end
  where id = p_raffle_id;

  perform private.log_admin_action(
    'suspend_raffle', 'raffles', p_raffle_id, p_reason,
    jsonb_build_object('type', p_type, 'until', p_until)
  );

  return jsonb_build_object('suspension_status', p_type);
end;
$$;

revoke execute on function public.admin_suspend_raffle(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.admin_suspend_raffle(uuid, text, text, timestamptz) to authenticated;

create function public.admin_unsuspend_raffle(
  p_raffle_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raffle public.raffles;
begin
  if not private.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to unsuspend a raffle.';
  end if;

  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if not found then
    raise exception 'Raffle not found.';
  end if;
  if v_raffle.suspension_status = 'active' then
    raise exception 'This raffle is not suspended.';
  end if;

  update public.raffles set
    suspension_status = 'active',
    suspended_at = null,
    suspended_until = null
  where id = p_raffle_id;

  perform private.log_admin_action(
    'unsuspend_raffle', 'raffles', p_raffle_id, p_reason, '{}'::jsonb
  );

  return jsonb_build_object('suspension_status', 'active');
end;
$$;

revoke execute on function public.admin_unsuspend_raffle(uuid, text) from public, anon;
grant execute on function public.admin_unsuspend_raffle(uuid, text) to authenticated;

create function public.admin_extend_raffle_draw(
  p_raffle_id uuid,
  p_new_draw_date timestamptz,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raffle public.raffles;
begin
  if not private.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to extend a draw date.';
  end if;

  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if not found then
    raise exception 'Raffle not found.';
  end if;
  if v_raffle.status <> 'live' then
    raise exception 'Only a live raffle''s draw date can be extended.';
  end if;

  update public.raffles set
    draw_date = p_new_draw_date,
    draw_date_extended_at = now()
  where id = p_raffle_id;

  perform private.log_admin_action(
    'extend_raffle_draw', 'raffles', p_raffle_id, p_reason,
    jsonb_build_object('from', v_raffle.draw_date, 'to', p_new_draw_date)
  );

  return jsonb_build_object('draw_date', p_new_draw_date);
end;
$$;

revoke execute on function public.admin_extend_raffle_draw(uuid, timestamptz, text) from public, anon;
grant execute on function public.admin_extend_raffle_draw(uuid, timestamptz, text) to authenticated;

-- ---------- Host/user suspension ----------
create function public.admin_suspend_user(
  p_user_id uuid,
  p_type text,
  p_reason text,
  p_ends_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
  v_raffle record;
begin
  if not private.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to suspend a user.';
  end if;
  if p_type not in ('temporary', 'permanent') then
    raise exception 'Unknown suspension type: %', p_type;
  end if;
  if p_type = 'temporary' and p_ends_at is null then
    raise exception 'An end date is required for a temporary suspension.';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found.';
  end if;
  if v_profile.status = 'suspended' then
    raise exception 'This user is already suspended.';
  end if;

  update public.profiles set
    status = 'suspended',
    suspension_type = p_type,
    suspension_ends_at = case when p_type = 'temporary' then p_ends_at else null end
  where id = p_user_id;

  -- Cascade: every active raffle this host runs is also temporarily
  -- suspended, regardless of how the host itself was suspended — the host
  -- must be reinstated AND each raffle separately unsuspended (see
  -- admin_unsuspend_user, which deliberately does not touch raffles).
  for v_raffle in
    select id from public.raffles
    where host_id = p_user_id and status = 'live' and suspension_status = 'active'
    for update
  loop
    update public.raffles set
      suspension_status = 'temporary',
      suspended_at = now(),
      suspended_until = p_ends_at
    where id = v_raffle.id;

    perform private.log_admin_action(
      'suspend_raffle', 'raffles', v_raffle.id,
      'Host suspended: ' || p_reason,
      jsonb_build_object('type', 'temporary', 'until', p_ends_at, 'cascaded_from_user', p_user_id)
    );
  end loop;

  perform private.log_admin_action(
    'suspend_user', 'profiles', p_user_id, p_reason,
    jsonb_build_object('type', p_type, 'ends_at', p_ends_at)
  );

  return jsonb_build_object('status', 'suspended', 'suspension_type', p_type);
end;
$$;

revoke execute on function public.admin_suspend_user(uuid, text, text, timestamptz) from public, anon;
grant execute on function public.admin_suspend_user(uuid, text, text, timestamptz) to authenticated;

create function public.admin_unsuspend_user(
  p_user_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not private.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to unsuspend a user.';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found.';
  end if;
  if v_profile.status <> 'suspended' then
    raise exception 'This user is not suspended.';
  end if;

  -- Deliberately does not touch this host's raffles — each one must be
  -- reviewed and unsuspended individually from the Raffles page.
  update public.profiles set
    status = 'active',
    suspension_type = null,
    suspension_ends_at = null
  where id = p_user_id;

  perform private.log_admin_action(
    'unsuspend_user', 'profiles', p_user_id, p_reason, '{}'::jsonb
  );

  return jsonb_build_object('status', 'active');
end;
$$;

revoke execute on function public.admin_unsuspend_user(uuid, text) from public, anon;
grant execute on function public.admin_unsuspend_user(uuid, text) to authenticated;

-- ---------- Enforce suspension at checkout ----------
-- A suspended raffle keeps status = 'live' (suspension is a standing flag,
-- not a lifecycle transition), so the existing status check alone would
-- not block ticket purchases. This adds the missing guard to both live
-- entry RPCs. Bodies otherwise match the current post-promo/charity-removal
-- versions (see 20260625010000 and 20260625020000) verbatim.
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

create or replace function public.create_pending_checkout(
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
  if v_raffle.suspension_status <> 'active' then
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
