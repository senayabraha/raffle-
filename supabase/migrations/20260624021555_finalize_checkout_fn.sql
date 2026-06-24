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
  v_promo_id uuid;
  v_total integer;
  v_start integer;
  v_uid uuid;
  i integer;
begin
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;

  -- Idempotent: webhooks can retry/duplicate-deliver.
  if v_payment.status <> 'pending' then
    return jsonb_build_object(
      'payment_id', v_payment.id,
      'status', v_payment.status,
      'already_finalized', true
    );
  end if;

  v_qty := (v_payment.meta->>'qty')::int;
  v_free := coalesce((v_payment.meta->>'free')::int, 0);
  v_promo_id := (v_payment.meta->>'promo_code_id')::uuid;
  v_uid := v_payment.payer_id;

  if v_promo_id is not null then
    update public.promo_codes set uses_count = uses_count + 1 where id = v_promo_id;
  end if;

  select coalesce(max(ticket_number), 0) into v_start
    from public.tickets where raffle_id = v_payment.raffle_id;
  v_total := v_qty + v_free;

  for i in 1..v_total loop
    insert into public.tickets (raffle_id, entrant_id, ticket_number, entry_type, payment_id, promo_code_id)
    values (
      v_payment.raffle_id, v_uid, v_start + i,
      case when i <= v_qty then 'paid'::public.entry_type
           else 'free_bonus'::public.entry_type end,
      case when i <= v_qty then v_payment.id else null end,
      v_promo_id
    );
  end loop;

  update public.raffles
    set tickets_sold_count = tickets_sold_count + v_total
    where id = v_payment.raffle_id;

  update public.payments
    set status = 'held', provider_ref = p_provider_ref
    where id = p_payment_id;

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
