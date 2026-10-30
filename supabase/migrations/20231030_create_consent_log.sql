create table public.consent_log (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete set null,
  anon_id text,
  kind text not null check (kind in ('tos', 'privacy', 'cookies', 'marketing')),
  version text not null,
  granted boolean not null,
  ip inet,
  created_at timestamptz not null default now()
);

alter table public.consent_log enable row level security;

create policy "Users can insert their own consent"
  on public.consent_log for insert
  with check (auth.uid() = user_id);

create policy "Anonymous users can insert consent"
  on public.consent_log for insert
  with check (auth.uid() is null);