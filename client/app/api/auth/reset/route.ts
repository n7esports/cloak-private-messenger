import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// IMPORTANT: No top-level createClient() / env-var reads here.
// Vercel's build "collecting page data" phase imports route modules before
// runtime environment variables are guaranteed to be available, so any
// module-scope Supabase initialization (or a shared lib that throws at import
// time, like @/lib/supabase) crashes the build with:
//   Error: Missing NEXT_PUBLIC_SUPABASE_URL
// The client is therefore created lazily, only when the handler runs.

/** Lazily create a Supabase client for use inside route handlers. */
function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  // Prefer the service-role key on the server so this route never depends on
  // browser-only env vars being present; fall back to the anon/publishable key.
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL. Set it in your environment.",
    );
  }
  if (!supabaseKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/ANON_KEY.",
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email } = (body as Record<string, unknown>) || {};
  if (typeof email !== "string") {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 },
    );
  }

  // Lazy-initialize the Supabase client INSIDE the handler and guard it with
  // try/catch so misconfiguration produces a clean 500 + log line instead of
  // an unhandled crash.
  let supabase: SupabaseClient;
  try {
    supabase = getSupabaseClient();
  } catch (error) {
    console.error("API CRASH:", error);
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("API CRASH:", error);
    return NextResponse.json(
      { error: "Failed to send reset email" },
      { status: 500 },
    );
  }
}
