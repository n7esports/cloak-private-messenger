import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://ksvwgbvhbvfrzqsohoox.supabase.co';

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_Q7YVPPGc4eFDVJYwRmHR2g_-gPv9-1D';

export const supabase = createClient(supabaseUrl, supabaseKey);