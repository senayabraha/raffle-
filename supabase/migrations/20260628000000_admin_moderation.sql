-- Admin panel, phase 3: moderation actions on live raffles and hosts.
-- First phase that lets admin act on *live* state outside a dispute, so
-- every transition here is allow-listed explicitly and rejected once
-- draw_audit has a row for the raffle (the draw already happened — fixing
-- that up belongs to phase 2's dispute flow, not here) and always goes
-- through private.log_admin_action() from phase 0.

-- ---------- Raffle moderation ----------
create function public.admin_set_raffle_status(
  p_raffle_id uuid,
  p_status text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raffle public.raffles;
  v_has_draw boolean;
begin
  if not private.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to moderate a raffle.';
  end if;

  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if not found then
    raise exception 'Raffle not found.';
  end if;

  select exists (select 1 from public.draw_audit where raffle_id = p_raffle_id) into v_has_draw;
  if v_has_draw then
    raise exception 'This raffle has already been drawn — use dispute resolution instead.';
  end if;

  if v_raffle.status <> 'live' then
    raise exception 'Only a live raffle can be moderated.';
  end if;
  if p_status not in ('draft', 'cancelled') then
    raise exception 'Unknown status: %', p_status;
  end if;

  update public.raffles set status = p_status::public.raffle_status where id = p_raffle_id;

  if p_status = 'cancelled' then
    update public.payments set status = 'refunded'
      where raffle_id = p_raffle_id and status = 'held';
  end if;

  perform private.log_admin_action(
    'set_raffle_status', 'raffles', p_raffle_id, p_reason,
    jsonb_build_object('from', v_raffle.status, 'to', p_status)
  );

  return jsonb_build_object('status', p_status);
end;
$$;

revoke execute on function public.admin_set_raffle_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_raffle_status(uuid, text, text) to authenticated;

-- ---------- Host/user moderation ----------
-- No enum — a plain checked text column, since suspension is an
-- account-standing flag rather than a fixed lifecycle the rest of the
-- schema branches on.
alter table public.profiles
  add column status text not null default 'active' check (status in ('active', 'suspended'));

create function public.admin_set_user_status(
  p_user_id uuid,
  p_status text,
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
  if p_status not in ('active', 'suspended') then
    raise exception 'Unknown status: %', p_status;
  end if;
  if p_reason is null or length(trim(p_reason)) = 0 then
    raise exception 'A reason is required to change a user''s status.';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found.';
  end if;

  update public.profiles set status = p_status where id = p_user_id;

  perform private.log_admin_action(
    'set_user_status', 'profiles', p_user_id, p_reason,
    jsonb_build_object('from', v_profile.status, 'to', p_status)
  );

  return jsonb_build_object('status', p_status);
end;
$$;

revoke execute on function public.admin_set_user_status(uuid, text, text) from public, anon;
grant execute on function public.admin_set_user_status(uuid, text, text) to authenticated;

create function public.admin_set_user_role(
  p_user_id uuid,
  p_role text,
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
    raise exception 'A reason is required to change a user''s role.';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found.';
  end if;

  update public.profiles set role = p_role::public.user_role where id = p_user_id;

  perform private.log_admin_action(
    'set_user_role', 'profiles', p_user_id, p_reason,
    jsonb_build_object('from', v_profile.role, 'to', p_role)
  );

  return jsonb_build_object('role', p_role);
end;
$$;

revoke execute on function public.admin_set_user_role(uuid, text, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text, text) to authenticated;
