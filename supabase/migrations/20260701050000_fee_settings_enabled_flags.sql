-- Per-fee enable/disable toggles for the platform fee/tax settings. Each rate in
-- platform_fee_settings can now be individually switched off so it is excluded
-- from the Revenue Planner (Step 2) and Review (Step 5) cost model entirely —
-- the line item is removed from the breakdown and from every calculation
-- (REVENUE_COST_RATE, fixed costs, break-even, target revenue, profit).
--
-- All flags default to true so existing behaviour is unchanged: every fee stays
-- enabled until an admin turns it off from the fees panel.

alter table public.platform_fee_settings
  add column if not exists lottery_tax_enabled         boolean not null default true,
  add column if not exists winner_tax_enabled          boolean not null default true,
  add column if not exists social_contribution_enabled boolean not null default true,
  add column if not exists platform_fee_enabled         boolean not null default true,
  add column if not exists payment_processing_enabled   boolean not null default true;
