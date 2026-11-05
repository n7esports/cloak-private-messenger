-- ============================================================================
-- DATABASE RESET SCRIPT — run ONCE in the Supabase SQL Editor.
--
-- WARNING: DESTRUCTIVE. This drops ALL rows in the public schema (users,
-- relay_queue, contacts, consent_log). There is no undo. All accounts must
-- re-register after this runs.
--
-- What it does:
--   1. Drops every table in public (CASCADE), then recreates ONLY the tables
--      the current code expects:
--        * public.users       -> client/app/api/auth/{signup,signin}/route.ts
--        * public.relay_queue -> supabase schema used by relay/API paths
--          (server/src/index.js itself uses an in-memory queue + token auth,
--           so locking the table to service_role breaks nothing)
--   2. Re-enables RLS on every remaining table (contacts, consent_log were
--      already RLS-protected; they survive as objects but are emptied).
--   3. Adds strict policies: users self-select only; relay_queue locked to
--      service_role; contacts/consent_log owner-scoped with anon blocked.
--
-- Legitimate app access flows through Next.js API routes using the
-- SERVICE-ROLE key, which BYPASSES RLS by design. Tightening these policies
-- does not break signin/signup or the relay server.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Step 1 — Drop all existing tables in the public schema
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS public.relay_queue   CASCADE;
DROP TABLE IF EXISTS public.users         CASCADE;
DROP TABLE IF EXISTS public.contacts      CASCADE;
DROP TABLE IF EXISTS public.consent_log   CASCADE;

-- ----------------------------------------------------------------------------
-- Step 2 — Recreate public.users (columns exactly as signup/signin expect)
--   signup inserts: alias, pin_hash; selects back: id, alias, profile_name, created_at
--   signin selects:  id, alias, profile_name, created_at, pin_hash (server-side only)
-- ----------------------------------------------------------------------------
CREATE TABLE public.users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias        text NOT NULL UNIQUE CHECK (length(alias) BETWEEN 3 AND 32),
  pin_hash     text NOT NULL,
  profile_name text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX users_alias_idx ON public.users (alias);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

-- Defense-in-depth: non-service roles get zero direct table privileges.
REVOKE ALL ON public.users FROM anon;
REVOKE ALL ON public.users FROM authenticated;

-- ----------------------------------------------------------------------------
-- Step 3 — Recreate public.relay_queue (as the original migration defined it)
-- ----------------------------------------------------------------------------
CREATE TABLE public.relay_queue (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_key  text NOT NULL,
  ciphertext     text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX relay_queue_recipient_idx ON public.relay_queue (recipient_key, created_at);

ALTER TABLE public.relay_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relay_queue FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.relay_queue FROM anon;
REVOKE ALL ON public.relay_queue FROM authenticated;

-- ----------------------------------------------------------------------------
-- Step 4 — Policies
-- ----------------------------------------------------------------------------

-- users: a signed-in user may read ONLY their own row (by auth UID).
-- Signup currently creates rows without a matching Supabase Auth user, so in
-- practice only the service role (which bypasses RLS) touches this table.
CREATE POLICY "users_self_select"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- relay_queue: locked down to service_role ONLY. The relay server and API
-- routes use the service key; anon/authenticated keys get nothing.
-- (FORCE RLS + REVOKE above already deny non-service roles; this policy makes
--  the intent explicit for service_role.)
CREATE POLICY "relay_service_only"
  ON public.relay_queue
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Step 5 — Recreate the other expected tables (emptied) with strict RLS
-- ----------------------------------------------------------------------------

CREATE TABLE public.contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id  uuid REFERENCES public.users(id) ON DELETE CASCADE,
  alias       text NOT NULL,
  public_key  text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.contacts FROM anon;

CREATE POLICY "contacts_owner_read"   ON public.contacts FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "contacts_owner_insert" ON public.contacts FOR INSERT  TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "contacts_owner_delete" ON public.contacts FOR DELETE  TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.consent_log (
  id         bigserial PRIMARY KEY,
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  anon_id    text,
  kind       text NOT NULL CHECK (kind IN ('tos', 'privacy', 'cookies', 'marketing')),
  version    text NOT NULL,
  granted    boolean NOT NULL,
  ip         inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.consent_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_log FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.consent_log FROM anon;

CREATE POLICY "consent_self_insert" ON public.consent_log FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "consent_self_read"   ON public.consent_log FOR SELECT TO authenticated USING (auth.uid() = user_id);

COMMIT;

-- ----------------------------------------------------------------------------
-- Verification (run after applying; expected results in comments)
-- ----------------------------------------------------------------------------
-- 1) All four tables show relrowsecurity = true:
--    SELECT relname, relrowsecurity FROM pg_class
--    WHERE relname IN ('users','relay_queue','contacts','consent_log');
--
-- 2) Anon leak attempts must fail:
--    SET ROLE anon;
--    SELECT count(*) FROM public.users;        -- expect: permission denied
--    SELECT count(*) FROM public.relay_queue;  -- expect: permission denied
--    RESET ROLE;
