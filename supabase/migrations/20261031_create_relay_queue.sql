create table public.relay_queue (
  id uuid primary key default gen_random_uuid(),
  recipient_key text not null,
  ciphertext text not null,
  created_at timestamptz not null default now()
);
alter table public.relay_queue enable row level security;
create policy "relay insert" on public.relay_queue for insert with check (true);
create policy "relay read" on public.relay_queue for select using (true);
create policy "relay delete" on public.relay_queue for delete using (true);