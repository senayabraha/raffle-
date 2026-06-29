-- Draft saving improvements: remember which step of the create-raffle wizard a
-- host was on so "Resume" lands them exactly where they left off instead of at
-- step 1. Stored as a 1-indexed step (1..5) on the raffle row itself, alongside
-- the existing draft fields. Only meaningful while status = 'draft'; harmless on
-- live raffles.

alter table public.raffles
  add column if not exists current_step integer default 1;
