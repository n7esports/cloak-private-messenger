import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rateLimit";
import { createSessionToken, sessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DUMMY_PIN_HASH = bcrypt.hash("000000", 12);

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { alias: rawAlias, pin } = body as Record<string, unknown>;
  if (
    typeof rawAlias !== "string" ||
    typeof pin !== "string" ||
    !/^[a-zA-Z0-9_-]{3,24}$/.test(rawAlias) ||
    !/^\d{6}$/.test(pin)
  ) {
    return NextResponse.json({ error: "Enter a valid alias and six-digit PIN" }, { status: 400 });
  }

  const alias = rawAlias.trim().toLowerCase();
  const limit = checkRateLimit(request, alias);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.max(1, Math.ceil((limit.retryAfterMs ?? 60_000) / 1000))) },
      },
    );
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey || !process.env.SESSION_SECRET) {
    return NextResponse.json({ error: "Authentication is temporarily unavailable" }, { status: 500 });
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await admin
      .from("users")
      .select("id, alias, pin_hash, profile_name")
      .eq("alias", alias)
      .maybeSingle();

    const hash = data?.pin_hash ?? await DUMMY_PIN_HASH;
    const pinMatches = await bcrypt.compare(pin, hash);
    if (error || !data || !pinMatches) {
      return NextResponse.json({ error: "Invalid alias or PIN" }, { status: 401 });
    }

    const token = await createSessionToken({ id: data.id, alias: data.alias });
    const response = NextResponse.json({
      user: { id: data.id, alias: data.alias, profile_name: data.profile_name ?? null },
    });
    response.cookies.set(sessionCookie.name, token, {
      httpOnly: sessionCookie.httpOnly,
      secure: sessionCookie.secure,
      sameSite: sessionCookie.sameSite,
      path: sessionCookie.path,
      maxAge: sessionCookie.maxAge,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Authentication is temporarily unavailable" }, { status: 500 });
  }
}
