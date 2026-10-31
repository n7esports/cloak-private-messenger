import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { consentSchema } from "@/lib/validations/consent";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: "Consent service is not configured" },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  let accessToken: string | undefined;

  if (authorization) {
    const match = authorization.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
      return NextResponse.json({ error: "Invalid authorization" }, { status: 401 });
    }
    accessToken = match[1];
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });

  let userId: string | null = null;
  if (accessToken) {
    const { data, error } = await supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      return NextResponse.json({ error: "Invalid or expired session" }, { status: 401 });
    }
    userId = data.user.id;
  }

  const { error } = await supabase.from("consent_log").insert({
    kind: parsed.data.kind,
    version: parsed.data.version,
    granted: parsed.data.granted,
    user_id: userId,
  });

  if (error) {
    // Do not expose database details or credentials to the caller.
    return NextResponse.json({ error: "Could not record consent" }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
