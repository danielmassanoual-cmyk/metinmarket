alter table if exists public.interest_requests
  add column if not exists desired text,
  add column if not exists max_price text,
  add column if not exists status text default 'Open';

notify pgrst, 'reload schema';
