-- Self-service host enrollment. An entrant who decides they want to run a
-- raffle calls this to gain host capability. It only ever *adds* capability:
-- an 'entrant' becomes 'both' (keeps the ability to enter raffles too), and
-- accounts that can already host are left untouched. Role is never downgraded
-- here, and admins are unaffected.
create function public.request_host_access()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role;
begin
  if v_uid is null then
    raise exception 'You must be signed in.' using errcode = '28000';
  end if;

  update public.profiles
    set role = 'both'
    where id = v_uid and role = 'entrant'
    returning role into v_role;

  if v_role is null then
    -- Already host/both/admin — nothing to change; report current role.
    select role into v_role from public.profiles where id = v_uid;
  end if;

  return jsonb_build_object('role', v_role);
end;
$$;

revoke execute on function public.request_host_access() from public, anon;
grant execute on function public.request_host_access() to authenticated;
