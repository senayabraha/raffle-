alter type public.payment_status add value if not exists 'pending' before 'held';
alter type public.payment_status add value if not exists 'failed';
