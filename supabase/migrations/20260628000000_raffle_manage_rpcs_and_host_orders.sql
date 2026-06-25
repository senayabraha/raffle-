-- Phase 3.2/3.3 of the host dashboard: a management RPC for a host's own
-- live raffle (safe edits + manual cancel), and a narrowly-scoped read
-- policy letting a host see the checkout contact details for orders on
-- their own raffles (new PII exposure — scoped to that host only, not a
-- relaxation of any existing public policy).

-- ---------- Edit description/images/prize value; price & cap locked after first sale ----------
create or replace function public.update_raffle_details(
  p_raffle_id uuid,
  p_description text,
  p_image_urls text[],
  p_prize_value numeric,
  p_ticket_price numeric,
  p_ticket_cap integer
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
    raise exception 'Only the host can edit this raffle.';
  end if;
  if v_raffle.status not in ('live', 'draft') then
    raise exception 'This raffle can no longer be edited.';
  end if;
  if v_raffle.tickets_sold_count > 0
     and (p_ticket_price <> v_raffle.ticket_price or p_ticket_cap is distinct from v_raffle.ticket_cap) then
    raise exception 'Ticket price and capacity can no longer be changed once tickets have sold.';
  end if;

  update public.raffles set
    description = p_description,
    image_urls = p_image_urls,
    prize_value = p_prize_value,
    ticket_price = p_ticket_price,
    ticket_cap = p_ticket_cap
  where id = p_raffle_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------- Manual cancel: only while live and nothing has sold ----------
create or replace function public.cancel_raffle(p_raffle_id uuid)
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
    raise exception 'Only the host can cancel this raffle.';
  end if;
  if v_raffle.status <> 'live' then
    raise exception 'Only live raffles can be cancelled this way.';
  end if;
  if v_raffle.tickets_sold_count > 0 then
    raise exception 'This raffle already has entries and cannot be cancelled here.';
  end if;

  update public.raffles set status = 'cancelled' where id = p_raffle_id;
  return jsonb_build_object('status', 'cancelled');
end;
$$;

-- ---------- Host-facing order contact details (new PII exposure, host-of-raffle only) ----------
create policy "Raffle hosts can view checkout contacts for their orders"
  on public.checkout_contacts for select to authenticated
  using (
    exists (
      select 1 from public.payments p
      where p.id = checkout_contacts.payment_id
        and private.is_raffle_host(p.raffle_id)
    )
  );
