-- ============================================================================
-- Fix 7 (F-08, F-09): Harden RLS on public.users and public.relay_queue
-- Target: Supabase Postgres (v15+). Run in the Supabase SQL Editor or via
--         `supabase db push`. Idempotent: safe to re-run.
--
-- Threats closed:
--   F-09: RLS was never enabled on public.users -> anyone holding the anon
--         key could SELECT alias + pin_hash via PostgREST.
--   F-08: relay_queue policies used USING (true) / WITH CHECK (true) for
--         insert/select/delete -> any anon key holder could read, poison,
--         or wipe the entire relay queue.
--
-- Design notes:
--   * The app's API routes (signin/signup) talk to both tables with a
--     SERVICE-ROLE client, which bypasses RLS. Tightening these policies
--     does NOT break login.
--   * No code in this repo reads/writes relay_queue with the anon key
--     (the relay server uses its own in-memory queue + UQZERA_RELAY_TOKEN),
--     so locking it to authenticated recipients is safe.
--   * Authenticated users may only touch relay rows addressed to their own
--     recipient key (realtime delivery path); inserts additionally require
--     a non-empty recipient_key.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Part 1 — public.users (F-09)
-- ----------------------------------------------------------------------------

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Defense-in-depth: never let PostgREST hand pin_hash to a non-service role.
REVOKE ALL ON public.users FROM anon;
REVOKE SELECT ON public.users FROM authenticated;

-- Drop the permissive policies from earlier migrations if they exist.
DROP POLICY IF EXISTS "users_select"        ON public.users;
DROP POLICY IF EXISTS "users_self_select"   ON public.users;
DROP POLICY IF EXISTS "users_insert"        ON public.users;
DROP POLICY IF EXISTS "users_update"        ON public.users;
DROP POLICY IF EXISTS "users_delete"        ON public.users;

-- A signed-in user can read ONLY their own row (by auth UID).
-- NOTE: signup creates rows in public.users without a matching Supabase Auth
-- user, so even this policy grants no access to the anon/service-less paths —
-- all legitimate access goes through service-role API routes, which bypass RLS.
CREATE POLICY "users_self_select"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- ----------------------------------------------------------------------------
-- Part 2 — public.relay_queue (F-08)
-- ----------------------------------------------------------------------------

ALTER TABLE public.relay_queue ENABLE ROW LEVEL SECURITY;

-- Belt-and-braces: also revoke direct table access from anon.
REVOKE ALL ON public.relay_queue FROM anon;

-- Remove the old USING (true) policies.
DROP POLICY IF EXISTS "relay insert" ON public.relay_queue;
DROP POLICY IF EXISTS "relay read"   ON public.relay_queue;
DROP POLICY IF EXISTS "relay delete" ON public.relay_queue;

-- Authenticated users may enqueue a message ONLY for themselves
-- (recipient_key must equal their own identity claim). Cross-user publishing
-- goes through the token-authenticated relay server, not PostgREST.
CREATE POLICY "relay_insert_own"
  ON public.relay_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (
    length(trim(recipient_key)) > 0
    AND recipient_key = coalesce(auth.jwt() ->> 'sub', '')
  );

-- Authenticated users may read ONLY messages addressed to their own key.
CREATE POLICY "relay_read_own"
  ON public.relay_queue
  FOR SELECT
  TO authenticated
  USING (
    recipient_key = coalesce(auth.jwt() ->> 'sub', '')
  );

-- Authenticated users may delete ONLY their own delivered messages.
CREATE POLICY "relay_delete_own"
  ON public.relay_queue
  FOR DELETE
  TO authenticated
  USING (
    recipient_key = coalesce(auth.jwt() ->> 'sub', '')
  );

-- ----------------------------------------------------------------------------
-- Verification queries (run after applying; expected results in comments)
-- ----------------------------------------------------------------------------

-- 1) Both tables must show relrowsecurity = true:
--    SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('users','relay_queue');
--
-- 2) No permissive policies should remain:
--    SELECT tablename, policyname, cmd, qual, with_check
--    FROM pg_policies WHERE schemaname = 'public'
--    AND tablename IN ('users','relay_queue');
--
-- 3) Simulate an anon leak attempt (should return 0 rows / permission denied):
--    SET ROLE anon;
--    SELECT count(*) FROM public.users;      -- expect: permission denied
--    SELECT count(*) FROM public.relay_queue; -- expect: permission denied
--    RESET ROLE;
