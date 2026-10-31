create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,
  pin_hash text not null,
  profile_name text,
  created_at timestamptz not null default now()
);
create index if not exists users_alias_idx on public.users (alias);