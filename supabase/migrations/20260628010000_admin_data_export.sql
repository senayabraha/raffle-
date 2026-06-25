-- Admin panel, phase 4: subject-access export.
-- Returns one JSON bundle of everything the platform holds tied to a given
-- user, for compliance/support data requests. Read-only and additive —
-- deletion is deliberately out of scope here since it needs explicit
-- product sign-off on what must be retained (financial records) vs. erased.
create function public.admin_export_user_data(p_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not private.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'profile', (select to_jsonb(p) from public.profiles p where p.id = p_user_id),
    'tickets', (
      select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      from public.tickets t where t.entrant_id = p_user_id
    ),
    'payments', (
      select coalesce(jsonb_agg(to_jsonb(pay)), '[]'::jsonb)
      from public.payments pay where pay.payer_id = p_user_id
    ),
    'winners', (
      select coalesce(jsonb_agg(to_jsonb(w)), '[]'::jsonb)
      from public.winners w where w.winner_id = p_user_id
    ),
    'hosted_raffles', (
      select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
      from public.raffles r where r.host_id = p_user_id
    )
  ) into v_result;

  perform private.log_admin_action(
    'export_user_data', 'profiles', p_user_id, 'Subject-access export', '{}'::jsonb
  );

  return v_result;
end;
$$;

revoke execute on function public.admin_export_user_data(uuid) from public, anon;
grant execute on function public.admin_export_user_data(uuid) to authenticated;
