-- The Revenue Planner (Step 2 of the create-raffle wizard) lets hosts model the
-- full economics of a raffle — prize value, the platform cost stack, a profit
-- target, and the resulting ticket price/cap — before committing to ticket
-- settings. Its working state needs to survive a saved draft so a returning
-- host can re-plan rather than start over. Stored as a single jsonb blob to
-- mirror the existing bundle_rules pattern and keep the column footprint small.
--
-- Shape: { prize_value, profit_target_pct, profit_target_etb, ticket_price, ticket_cap }

alter table public.raffles
  add column if not exists planner_state jsonb;
