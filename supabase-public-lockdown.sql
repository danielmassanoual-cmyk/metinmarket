-- Run this in Supabase SQL Editor after setting SUPABASE_SERVICE_ROLE_KEY
-- in the deployment environment. Public writes should go through Next.js
-- API routes only, where Turnstile is verified server-side.

alter table public.sale_submissions enable row level security;
alter table public.buy_orders enable row level security;
alter table public.interest_requests enable row level security;

drop policy if exists "public insert sale submissions" on public.sale_submissions;
drop policy if exists "public insert buy orders" on public.buy_orders;
drop policy if exists "public insert interest requests" on public.interest_requests;

drop policy if exists "anon insert sale submissions" on public.sale_submissions;
drop policy if exists "anon insert buy orders" on public.buy_orders;
drop policy if exists "anon insert interest requests" on public.interest_requests;

revoke insert on public.sale_submissions from anon;
revoke insert on public.buy_orders from anon;
revoke insert on public.interest_requests from anon;

-- Optional, if your storage bucket had public upload policies. Keep public
-- read if listings must display images, but remove anonymous writes.
drop policy if exists "public upload listing images" on storage.objects;
drop policy if exists "anon upload listing images" on storage.objects;
revoke insert on storage.objects from anon;
