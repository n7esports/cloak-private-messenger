-- Restrict consent inserts to verified Supabase identities or anonymous rows.
-- The API validates bearer tokens with supabase.auth.getUser() before inserting.

drop policy if exists "Users can insert their own consent" on public.consent_log;
drop policy if exists "Anonymous users can insert consent" on public.consent_log;
drop policy if exists "consent_log_insert_authenticated" on public.consent_log;
drop policy if exists "consent_log_insert_anon" on public.consent_log;

create policy "consent_log_insert_authenticated"
  on public.consent_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "consent_log_insert_anon"
  on public.consent_log
  for insert
  to anon
  with check (user_id is null);
