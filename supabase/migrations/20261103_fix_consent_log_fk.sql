-- Fix consent_log foreign key to reference public.users(id) instead of auth.users(id)
-- because custom auth uses public.users.

BEGIN;

-- Drop the existing FK if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'consent_log_user_id_fkey'
      AND conrelid = 'public.consent_log'::regclass
  ) THEN
    ALTER TABLE public.consent_log
      DROP CONSTRAINT consent_log_user_id_fkey;
  END IF;
END $$;

-- Recreate FK pointing to public.users
ALTER TABLE public.consent_log
  ADD CONSTRAINT consent_log_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE SET NULL;

-- Ensure backend role can write
GRANT ALL ON TABLE public.consent_log TO service_role;

COMMIT;
