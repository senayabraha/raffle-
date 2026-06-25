-- Hosts could only attach a single prize photo and had no way to state the
-- prize's retail value or its condition/delivery method — all three are
-- things entrants weigh before buying a ticket. This replaces the single
-- image_url column with a host-ordered gallery and adds the missing fields.

create type public.prize_condition as enum ('new', 'used', 'refurbished');
create type public.delivery_method as enum ('shipping', 'pickup', 'digital', 'cash_equivalent');

alter table public.raffles
  add column image_urls text[] not null default '{}'::text[],
  add column prize_value numeric,
  add column condition public.prize_condition,
  add column delivery_method public.delivery_method;

update public.raffles
  set image_urls = array[image_url]
  where image_url is not null;

alter table public.raffles
  drop column image_url;
