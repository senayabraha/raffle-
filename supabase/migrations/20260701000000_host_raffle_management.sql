-- Host raffle management, phase 3.4: self-service tools for a host's own
-- live raffle once tickets have started selling. Two abilities layered on
-- top of the existing edit/cancel RPCs (see 20260628000000):
--   1. Extend the draw date — capped at twice, +15 days each time.
--   2. Request cancellation — once tickets have sold a host can no longer
--      cancel directly (cancel_raffle rejects it), so instead they file a
--      request for an admin to review.
-- draw_date_extended_at already exists from the admin suspension migration
-- (20260630050000); we only add the host-side counters here.

-- ---------- A. Draw date extension tracking ----------
alter table public.raffles
  add column if not exists draw_date_extension_count integer not null default 0,
  add column if not exists draw_date_last_extended_at timestamptz;

-- ---------- B. Cancellation requests ----------
create table public.cancellation_requests (
  id uuid primary key default gen_random_uuid(),
  raffle_id uuid not null references public.raffles(id) on delete cascade,
  host_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index cancellation_requests_raffle_id_idx
  on public.cancellation_requests (raffle_id);
create index cancellation_requests_host_id_idx
  on public.cancellation_requests (host_id);

alter table public.cancellation_requests enable row level security;

-- Hosts manage their own requests.
create policy "Hosts can insert their own cancellation requests"
  on public.cancellation_requests for insert to authenticated
  with check (host_id = auth.uid());

create policy "Hosts can view their own cancellation requests"
  on public.cancellation_requests for select to authenticated
  using (host_id = auth.uid());

-- Admins can review and resolve every request.
create policy "Admins can view all cancellation requests"
  on public.cancellation_requests for select to authenticated
  using (private.is_admin());

create policy "Admins can update all cancellation requests"
  on public.cancellation_requests for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- ---------- C. Host draw date extension ----------
create function public.host_extend_draw_date(
  p_raffle_id uuid,
  p_new_draw_date timestamptz
)
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
  if not found then
    raise exception 'Raffle not found.';
  end if;
  if v_raffle.host_id <> v_uid then
    raise exception 'Only the host can extend this raffle.';
  end if;
  if v_raffle.status <> 'live' then
    raise exception 'Only live raffles can be extended.';
  end if;
  if v_raffle.tickets_sold_count = 0 then
    raise exception 'No tickets have sold yet; edit the draw date directly instead.';
  end if;
  if v_raffle.draw_date_extension_count >= 2 then
    raise exception 'Draw date can only be extended twice.';
  end if;
  if p_new_draw_date <= v_raffle.draw_date then
    raise exception 'New date must be after the current draw date.';
  end if;
  if p_new_draw_date > v_raffle.draw_date + interval '15 days' then
    raise exception 'Each extension is capped at 15 days beyond the current draw date.';
  end if;

  update public.raffles set
    draw_date = p_new_draw_date,
    draw_date_extension_count = draw_date_extension_count + 1,
    draw_date_last_extended_at = now()
  where id = p_raffle_id;

  return jsonb_build_object(
    'draw_date', p_new_draw_date,
    'extension_count', v_raffle.draw_date_extension_count + 1
  );
end;
$$;

revoke execute on function public.host_extend_draw_date(uuid, timestamptz) from public, anon;
grant execute on function public.host_extend_draw_date(uuid, timestamptz) to authenticated;

-- ---------- D. Host cancellation request ----------
create function public.host_request_cancellation(
  p_raffle_id uuid,
  p_reason text
)
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
  if not found then
    raise exception 'Raffle not found.';
  end if;
  if v_raffle.host_id <> v_uid then
    raise exception 'Only the host can request cancellation.';
  end if;
  if v_raffle.status <> 'live' then
    raise exception 'Only live raffles can be cancelled.';
  end if;
  if v_raffle.tickets_sold_count = 0 then
    raise exception 'No tickets have sold; cancel directly instead.';
  end if;
  if exists (
    select 1 from public.cancellation_requests
    where raffle_id = p_raffle_id and status = 'pending'
  ) then
    raise exception 'A cancellation request is already pending for this raffle.';
  end if;

  insert into public.cancellation_requests (raffle_id, host_id, reason)
  values (p_raffle_id, v_uid, p_reason);

  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.host_request_cancellation(uuid, text) from public, anon;
grant execute on function public.host_request_cancellation(uuid, text) to authenticated;

-- ---------- E. Admin resolution of cancellation requests ----------
-- Closes the loop on the host request above: an admin approves (which
-- cancels the raffle and refunds held payments, mirroring
-- admin_set_raffle_status and the min-target auto-cancellation path) or
-- rejects it. Either way the host is notified and the action is logged.
create function public.admin_resolve_cancellation(
  p_request_id uuid,
  p_decision text,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.cancellation_requests;
  v_raffle public.raffles;
begin
  if not private.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'Unknown decision: %', p_decision;
  end if;

  select * into v_request from public.cancellation_requests
    where id = p_request_id for update;
  if not found then
    raise exception 'Cancellation request not found.';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This cancellation request has already been resolved.';
  end if;

  select * into v_raffle from public.raffles where id = v_request.raffle_id for update;
  if not found then
    raise exception 'Raffle not found.';
  end if;

  if p_decision = 'approve' then
    update public.raffles set status = 'cancelled' where id = v_raffle.id;
    update public.payments set status = 'refunded'
      where raffle_id = v_raffle.id and status = 'held';

    update public.cancellation_requests set
      status = 'approved', admin_note = p_note, resolved_at = now()
    where id = p_request_id;

    insert into public.notifications (user_id, type, title, body, raffle_id)
    values (
      v_request.host_id, 'cancellation_approved', 'Cancellation approved',
      'Your request to cancel "' || v_raffle.title ||
        '" was approved. The raffle has been cancelled and entrants refunded.',
      v_raffle.id
    );
  else
    update public.cancellation_requests set
      status = 'rejected', admin_note = p_note, resolved_at = now()
    where id = p_request_id;

    insert into public.notifications (user_id, type, title, body, raffle_id)
    values (
      v_request.host_id, 'cancellation_rejected', 'Cancellation declined',
      'Your request to cancel "' || v_raffle.title || '" was declined.' ||
        coalesce(' Note: ' || nullif(trim(p_note), ''), ''),
      v_raffle.id
    );
  end if;

  perform private.log_admin_action(
    'resolve_cancellation', 'cancellation_requests', p_request_id, p_note,
    jsonb_build_object('decision', p_decision, 'raffle_id', v_raffle.id)
  );

  return jsonb_build_object(
    'status', case when p_decision = 'approve' then 'approved' else 'rejected' end
  );
end;
$$;

revoke execute on function public.admin_resolve_cancellation(uuid, text, text) from public, anon;
grant execute on function public.admin_resolve_cancellation(uuid, text, text) to authenticated;
