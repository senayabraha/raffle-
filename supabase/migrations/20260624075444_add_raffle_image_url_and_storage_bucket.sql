alter table public.raffles
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('raffle-images', 'raffle-images', true)
on conflict (id) do nothing;
