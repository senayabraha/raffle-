create or replace function public.get_checkout_status(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_payment public.payments;
  v_raffle public.raffles;
  v_tickets jsonb;
begin
  select * into v_payment from public.payments where id = p_payment_id;
  if not found then
    raise exception 'Checkout not found.';
  end if;

  select * into v_raffle from public.raffles where id = v_payment.raffle_id;

  select jsonb_agg(ticket_number order by ticket_number)
    into v_tickets
    from public.tickets where payment_id = v_payment.id;

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'status', v_payment.status,
    'amount', v_payment.amount_gross,
    'provider', v_payment.provider,
    'raffle_title', v_raffle.title,
    'raffle_slug', v_raffle.slug,
    'draw_date', v_raffle.draw_date,
    'paid', (v_payment.meta->>'qty')::int,
    'free', coalesce((v_payment.meta->>'free')::int, 0),
    'ticket_numbers', coalesce(v_tickets, '[]'::jsonb)
  );
end;
$function$;

grant execute on function public.get_checkout_status(uuid) to anon, authenticated;
