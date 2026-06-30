-- Real settlement engine: replaces the placeholder 15%/10% tiered commission
-- (hardcoded in purchase_tickets / create_pending_checkout) with live fees read
-- from platform_fee_settings, and tracks withheld taxes in a remittance ledger.
--
-- Money model per ticket sale (gross = ticket_price * paid_qty):
--   lottery_tax          -> withheld, owed to the lottery authority   (ledger)
--   social_contribution  -> withheld, owed as social contribution     (ledger)
--   platform_fee         -> the platform's own revenue   (NOT a tax, no ledger)
--   payment_processing   -> the processor's cut          (NOT a tax, no ledger)
--   host_net = gross - (all four above)
-- Winner tax is separate: withheld from prize_value at draw time (see below).
--
-- Switchover is immediate and total. The old tier-based rate lookup is removed
-- from every checkout RPC; subscription_tier itself is left intact since other
-- features still use it. Already-settled payments are NOT recomputed.

-- ============================================================================
-- PART 1 — Withheld tax ledger
-- ============================================================================
create table if not exists public.withheld_taxes (
  id                 uuid primary key default gen_random_uuid(),
  raffle_id          uuid not null references public.raffles (id) on delete cascade,
  tax_type           text not null check (tax_type in (
                       'lottery_tax', 'winner_tax', 'social_contribution'
                     )),
  amount             numeric not null,
  -- 'checkout' = withheld per ticket sale (lottery_tax, social_contribution)
  -- 'payout'   = withheld at draw/prize time (winner_tax)
  source             text not null check (source in ('checkout', 'payout')),
  -- set only when source = 'checkout', tying the row to its ticket payment
  related_payment_id uuid references public.payments (id) on delete set null,
  status             text not null default 'withheld' check (status in (
                       'withheld', 'remitted'
                     )),
  remitted_at        timestamptz,
  -- stamped by an admin when the tax is actually paid out to the authority
  remitted_by        uuid references auth.users (id),
  created_at         timestamptz not null default now()
);

create index if not exists idx_withheld_taxes_raffle on public.withheld_taxes (raffle_id);
create index if not exists idx_withheld_taxes_status on public.withheld_taxes (status);

alter table public.withheld_taxes enable row level security;

-- Admins manage everything; hosts may read rows for raffles they own. Uses the
-- established private.is_admin() helper (security definer, avoids RLS recursion)
-- rather than an inline EXISTS over profiles — matching every other admin policy.
create policy "Admins manage all withheld taxes"
  on public.withheld_taxes for all
  using (private.is_admin())
  with check (private.is_admin());

create policy "Hosts can view withheld taxes on their own raffles"
  on public.withheld_taxes for select
  using (
    exists (
      select 1 from public.raffles
      where raffles.id = withheld_taxes.raffle_id
        and raffles.host_id = auth.uid()
    )
  );

-- ============================================================================
-- PART 4 (schema) — itemised breakdown persisted on each payment
-- ============================================================================
-- Captures the exact amount withheld at the time of the transaction so the
-- historical breakdown stays accurate even after an admin changes the rates.
-- platform_commission is repurposed to hold the platform_fee portion (the
-- platform's real revenue), so the admin Payments/Overview totals stay correct.
alter table public.payments
  add column if not exists lottery_tax_withheld         numeric not null default 0,
  add column if not exists social_contribution_withheld numeric not null default 0,
  add column if not exists platform_fee_withheld        numeric not null default 0,
  add column if not exists payment_processing_withheld  numeric not null default 0;

-- ============================================================================
-- Shared fee calculator — single source of truth for the checkout math
-- ============================================================================
-- Reads the live single-row settings and applies each enabled rate to gross.
-- Both checkout RPCs call this so the math is never duplicated.
create or replace function private.compute_fee_breakdown(p_gross numeric)
returns table (
  lottery_tax         numeric,
  social_contribution numeric,
  platform_fee        numeric,
  payment_processing  numeric
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  s public.platform_fee_settings;
begin
  select * into s from public.platform_fee_settings where id = 1;

  lottery_tax := case when s.lottery_tax_enabled
    then round(p_gross * s.lottery_tax_rate, 2) else 0 end;
  social_contribution := case when s.social_contribution_enabled
    then round(p_gross * s.social_contribution_rate, 2) else 0 end;
  platform_fee := case when s.platform_fee_enabled
    then round(p_gross * s.platform_fee_rate, 2) else 0 end;
  payment_processing := case when s.payment_processing_enabled
    then round(p_gross * s.payment_processing_rate, 2) else 0 end;
  return next;
end;
$$;

-- ============================================================================
-- PART 2 — purchase_tickets (direct path: payment is 'held' immediately, so the
-- tax ledger rows are written here and now)
-- ============================================================================
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
  v_gross numeric;
  v_free integer := 0;
  v_bundle jsonb;
  v_fees record;
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

  -- Live settlement fees (replaces the old subscription-tier commission).
  select * into v_fees from private.compute_fee_breakdown(v_gross);
  v_host_net := v_gross
    - v_fees.lottery_tax - v_fees.social_contribution
    - v_fees.platform_fee - v_fees.payment_processing;

  insert into public.payments (
    raffle_id, payer_id, amount_gross, platform_commission, host_net, status,
    lottery_tax_withheld, social_contribution_withheld,
    platform_fee_withheld, payment_processing_withheld
  ) values (
    p_raffle_id, v_uid, v_gross, v_fees.platform_fee, v_host_net, 'held',
    v_fees.lottery_tax, v_fees.social_contribution,
    v_fees.platform_fee, v_fees.payment_processing
  ) returning id into v_payment_id;

  -- Only true withholding taxes go into the remittance ledger.
  if v_fees.lottery_tax > 0 then
    insert into public.withheld_taxes (raffle_id, tax_type, amount, source, related_payment_id)
    values (p_raffle_id, 'lottery_tax', v_fees.lottery_tax, 'checkout', v_payment_id);
  end if;
  if v_fees.social_contribution > 0 then
    insert into public.withheld_taxes (raffle_id, tax_type, amount, source, related_payment_id)
    values (p_raffle_id, 'social_contribution', v_fees.social_contribution, 'checkout', v_payment_id);
  end if;

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
    set tickets_sold_count = tickets_sold_count + p_qty  -- paid tickets only
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

-- ============================================================================
-- PART 2 — create_pending_checkout (gateway path: payment is 'pending' and may
-- be abandoned, so the itemised amounts are stored but the ledger rows are NOT
-- written until finalize_checkout confirms the sale)
-- ============================================================================
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
  v_gross numeric;
  v_free integer := 0;
  v_bundle jsonb;
  v_fees record;
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

  -- Live settlement fees. The breakdown is frozen onto the payment row now so
  -- finalize_checkout can settle (and ledger) it at the rates that applied here.
  select * into v_fees from private.compute_fee_breakdown(v_gross);
  v_host_net := v_gross
    - v_fees.lottery_tax - v_fees.social_contribution
    - v_fees.platform_fee - v_fees.payment_processing;

  insert into public.payments (
    raffle_id, payer_id, amount_gross, platform_commission, host_net,
    status, provider, meta,
    lottery_tax_withheld, social_contribution_withheld,
    platform_fee_withheld, payment_processing_withheld
  ) values (
    p_raffle_id, v_uid, v_gross, v_fees.platform_fee, v_host_net,
    'pending', p_provider,
    jsonb_build_object('qty', p_qty, 'free', v_free),
    v_fees.lottery_tax, v_fees.social_contribution,
    v_fees.platform_fee, v_fees.payment_processing
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

-- ============================================================================
-- PART 2 — finalize_checkout (gateway settlement point: writes the tax ledger
-- rows from the amounts frozen on the payment, exactly once)
-- ============================================================================
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

  -- Idempotent: webhooks can retry/duplicate-deliver. The ledger insert below
  -- is guarded by this early return so taxes are never double-counted.
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
    set tickets_sold_count = tickets_sold_count + v_qty  -- paid tickets only
    where id = v_payment.raffle_id;

  update public.payments
    set status = 'held', provider_ref = p_provider_ref
    where id = p_payment_id;

  -- Settlement: the sale is now real, so record the withholding taxes that were
  -- frozen onto this payment at checkout time.
  if v_payment.lottery_tax_withheld > 0 then
    insert into public.withheld_taxes (raffle_id, tax_type, amount, source, related_payment_id)
    values (v_payment.raffle_id, 'lottery_tax', v_payment.lottery_tax_withheld, 'checkout', v_payment.id);
  end if;
  if v_payment.social_contribution_withheld > 0 then
    insert into public.withheld_taxes (raffle_id, tax_type, amount, source, related_payment_id)
    values (v_payment.raffle_id, 'social_contribution', v_payment.social_contribution_withheld, 'checkout', v_payment.id);
  end if;

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

revoke all on function public.finalize_checkout(uuid, text) from public;
grant execute on function public.finalize_checkout(uuid, text) to service_role;

-- ============================================================================
-- PART 3 — Winner tax withheld at draw time
-- ============================================================================
-- private.draw_raffle is the real "drawn" transition (status -> ended, winner
-- selected). When a winner exists, withhold the winner tax from the prize value
-- and record it in the ledger with source 'payout'. The amount is informational
-- for physical prizes — it is what the winner owes (or what is collected before
-- a cash-equivalent prize is released). Re-emitted in full to add this step.
create or replace function private.draw_raffle(p_raffle_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raffle public.raffles;
  v_entries integer;
  v_seed text;
  v_index integer;
  v_ticket public.tickets;
  v_settings public.platform_fee_settings;
  v_winner_tax numeric;
begin
  select * into v_raffle from public.raffles where id = p_raffle_id for update;
  if not found or v_raffle.status <> 'live' then
    return;
  end if;

  select count(*) into v_entries from public.tickets where raffle_id = p_raffle_id;
  v_seed := encode(gen_random_bytes(32), 'hex');

  if v_entries = 0 then
    update public.raffles
      set status = 'ended', draw_date = coalesce(draw_date, now())
      where id = p_raffle_id;
    insert into public.draw_audit (raffle_id, seed, entries)
      values (p_raffle_id, v_seed, 0);
    return;
  end if;

  -- Deterministic winning index derived from the seed.
  v_index := (('x' || substr(md5(v_seed), 1, 15))::bit(60)::bigint % v_entries)::integer;

  select * into v_ticket
    from public.tickets
    where raffle_id = p_raffle_id
    order by ticket_number
    offset v_index limit 1;

  insert into public.winners (
    raffle_id, ticket_id, winner_id, notified_at, claim_deadline, prize_status
  ) values (
    p_raffle_id, v_ticket.id, v_ticket.entrant_id, now(),
    now() + interval '21 days', 'awaiting_claim'
  );

  update public.raffles
    set status = 'ended', draw_date = coalesce(draw_date, now())
    where id = p_raffle_id;

  insert into public.draw_audit (
    raffle_id, seed, entries, drawn_index, drawn_ticket_number, winner_id
  ) values (
    p_raffle_id, v_seed, v_entries, v_index, v_ticket.ticket_number, v_ticket.entrant_id
  );

  -- Withhold winner tax from the prize value (separate event from checkout).
  select * into v_settings from public.platform_fee_settings where id = 1;
  v_winner_tax := case
    when v_settings.winner_tax_enabled and v_raffle.prize_value is not null
    then round(v_raffle.prize_value * v_settings.winner_tax_rate, 2)
    else 0 end;

  if v_winner_tax > 0 then
    insert into public.withheld_taxes (raffle_id, tax_type, amount, source)
    values (p_raffle_id, 'winner_tax', v_winner_tax, 'payout');
  end if;
end;
$$;

-- ============================================================================
-- PART 5 — Admin: mark a withheld tax row as remitted
-- ============================================================================
-- Flips status -> 'remitted' and stamps who/when. Mirrors the other admin RPCs:
-- security definer, gated on private.is_admin(), writes the admin audit log.
create or replace function public.admin_mark_tax_remitted(p_tax_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.withheld_taxes;
begin
  if not private.is_admin() then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select * into v_row from public.withheld_taxes where id = p_tax_id for update;
  if not found then
    raise exception 'Withheld tax row not found.';
  end if;
  if v_row.status = 'remitted' then
    raise exception 'This tax has already been marked as remitted.';
  end if;

  update public.withheld_taxes
    set status = 'remitted', remitted_at = now(), remitted_by = v_uid
    where id = p_tax_id;

  perform private.log_admin_action(
    'mark_tax_remitted', 'withheld_taxes', p_tax_id, null,
    jsonb_build_object('tax_type', v_row.tax_type, 'amount', v_row.amount, 'raffle_id', v_row.raffle_id)
  );

  return jsonb_build_object('id', p_tax_id, 'status', 'remitted');
end;
$$;

revoke execute on function public.admin_mark_tax_remitted(uuid) from public, anon;
grant execute on function public.admin_mark_tax_remitted(uuid) to authenticated;
