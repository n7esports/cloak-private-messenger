create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  contact_id uuid references public.users(id) on delete cascade,
  alias text not null,
  public_key text not null,
  created_at timestamptz not null default now()
);
alter table public.contacts enable row level security;
create policy "contacts owner read" on public.contacts for select using (auth.uid() = owner_id);
create policy "contacts owner insert" on public.contacts for insert with check (auth.uid() = owner_id);
create policy "contacts owner delete" on public.contacts for delete using (auth.uid() = owner_id);