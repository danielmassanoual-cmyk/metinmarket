create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  reason text not null,
  reporter_contact text,
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

alter table public.listing_reports enable row level security;

revoke insert on public.listing_reports from anon;

drop policy if exists "Admin can read listing reports" on public.listing_reports;
create policy "Admin can read listing reports"
  on public.listing_reports
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'danielmassano.ual@gmail.com');

drop policy if exists "Admin can update listing reports" on public.listing_reports;
create policy "Admin can update listing reports"
  on public.listing_reports
  for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'danielmassano.ual@gmail.com')
  with check (auth.jwt() ->> 'email' = 'danielmassano.ual@gmail.com');

drop policy if exists "Admin can delete listing reports" on public.listing_reports;
create policy "Admin can delete listing reports"
  on public.listing_reports
  for delete
  to authenticated
  using (auth.jwt() ->> 'email' = 'danielmassano.ual@gmail.com');
