import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// No hardcoded fallbacks: a project URL or key embedded in source is exposed
// to anyone who reads the bundle. Both must come from the environment.
if (!supabaseUrl) {
  throw new Error(
    'Missing Supabase project URL. Set NEXT_PUBLIC_SUPABASE_URL in your environment.'
  );
}

if (!supabaseKey) {
  throw new Error(
    'Missing Supabase publishable key. Set NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
