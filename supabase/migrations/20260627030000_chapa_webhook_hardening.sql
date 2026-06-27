-- Hardening for the Chapa payment webhook (verify-payment Edge Function).
--
-- The webhook now verifies Chapa's HMAC-SHA256 signature before acting, and
-- finalize_checkout() is already idempotent on payments.status. This adds a
-- second, database-level guard so the same Chapa transaction reference can
-- never be recorded against two different payment rows even if a malformed
-- or replayed webhook slips through the application checks.
create unique index if not exists payments_provider_ref_key
  on public.payments (provider_ref)
  where provider_ref is not null;

-- Legacy column from the abandoned Stripe path. The Ethiopian checkout flow
-- (Chapa/Telebirr) records the gateway reference in payments.provider_ref,
-- and a grep of the codebase confirms stripe_payment_id is never read or
-- written. Drop it to avoid confusion.
alter table public.payments drop column if exists stripe_payment_id;
