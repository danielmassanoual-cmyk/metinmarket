alter table if exists public.sale_records
  add column if not exists admin_note text;

alter table if exists public.interest_requests
  add column if not exists admin_note text;

alter table if exists public.listing_reports
  add column if not exists admin_note text;
