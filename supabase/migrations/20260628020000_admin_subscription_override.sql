-- Admin panel, phase 5 (subscription override only — commission-rate config
-- is deliberately not part of this migration; it touches the hardcoded
-- 0.15/0.10 commission literals in purchase_tickets/create_pending_checkout
-- and needs its own careful review/testing pass on the checkout path).
create function public.admin_set_subscription_tier(
  p_user_id uuid,
  p_tier text,
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
    raise exception 'A reason is required to change a user''s subscription tier.';
  end if;

  select * into v_profile from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User not found.';
  end if;

  update public.profiles set subscription_tier = p_tier::public.subscription_tier
    where id = p_user_id;

  perform private.log_admin_action(
    'set_subscription_tier', 'profiles', p_user_id, p_reason,
    jsonb_build_object('from', v_profile.subscription_tier, 'to', p_tier)
  );

  return jsonb_build_object('subscription_tier', p_tier);
end;
$$;

revoke execute on function public.admin_set_subscription_tier(uuid, text, text) from public, anon;
grant execute on function public.admin_set_subscription_tier(uuid, text, text) to authenticated;
