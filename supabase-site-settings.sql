create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value)
values ('maintenance', '{"enabled": false, "message": "Submissions are temporarily closed. Please try again later."}'::jsonb)
on conflict (key) do nothing;

alter table public.site_settings enable row level security;

drop policy if exists "Admin can read site settings" on public.site_settings;
create policy "Admin can read site settings"
  on public.site_settings
  for select
  to authenticated
  using (auth.jwt() ->> 'email' = 'danielmassano.ual@gmail.com');

drop policy if exists "Admin can update site settings" on public.site_settings;
create policy "Admin can update site settings"
  on public.site_settings
  for update
  to authenticated
  using (auth.jwt() ->> 'email' = 'danielmassano.ual@gmail.com')
  with check (auth.jwt() ->> 'email' = 'danielmassano.ual@gmail.com');
