alter table if exists public.interest_requests
  add column if not exists desired text,
  add column if not exists max_price text,
  add column if not exists status text default 'Open';

create table if not exists public.sale_records (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  source_type text not null,
  source_id uuid,
  quantity numeric not null default 1,
  profit numeric not null default 0,
  listing_title text,
  listing_server text,
  buyer_contact text,
  created_at timestamptz not null default now()
);

alter table public.sale_records enable row level security;

drop policy if exists "Admin can read sale records" on public.sale_records;
create policy "Admin can read sale records"
  on public.sale_records
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'danielmassano.ual@gmail.com');

drop policy if exists "Admin can insert sale records" on public.sale_records;
create policy "Admin can insert sale records"
  on public.sale_records
  for insert
  to authenticated
  with check (auth.jwt() ->> 'email' = 'danielmassano.ual@gmail.com');

drop policy if exists "Admin can delete sale records" on public.sale_records;
create policy "Admin can delete sale records"
  on public.sale_records
  for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'danielmassano.ual@gmail.com');
