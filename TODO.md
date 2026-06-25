# TODO

## Phase 5 — Larger bets (not yet built)

`HOST_DASHBOARD_ACTION_PLAN.md`'s Phase 5 (host payouts, identity
verification, promo/referral tooling) is intentionally not implemented as
functioning code yet.

- No real payment-out provider/flow has been chosen. The previous
  payout/affiliate/charity subsystem was removed in
  `supabase/migrations/20260625010000_remove_payout_affiliate_charity.sql`
  because it never executed a real transfer — don't rebuild placeholder UI
  for this; wait for a product decision on an actual payout provider first.
- Identity verification and promo/referral tooling have no design yet either.

Revisit once there's a concrete provider/design to implement against.
