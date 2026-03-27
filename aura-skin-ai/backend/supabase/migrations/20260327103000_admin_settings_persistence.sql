create table if not exists public.admin_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_settings_updated_at
  on public.admin_settings (updated_at desc);
