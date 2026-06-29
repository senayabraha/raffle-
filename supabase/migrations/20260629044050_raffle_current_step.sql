-- Persists which wizard step a host last had open so a saved draft resumes
-- where they left off rather than at step 1. Backfilled into the repo to match
-- the column already applied to the database (migration version 20260629044050).

alter table public.raffles
  add column if not exists current_step integer default 1;
