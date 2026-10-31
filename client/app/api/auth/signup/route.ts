import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

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

  const { alias: rawAlias, pin, profileName: rawProfileName } = body as Record<string, unknown>;
  if (
    typeof rawAlias !== "string" ||
    typeof pin !== "string" ||
    !/^[a-zA-Z0-9_-]{3,24}$/.test(rawAlias) ||
    !/^\d{6}$/.test(pin) ||
    (rawProfileName !== undefined && rawProfileName !== null && typeof rawProfileName !== "string")
  ) {
    return NextResponse.json(
      { error: "Alias must be 3–24 letters, numbers, underscores or hyphens; PIN must be six digits." },
      { status: 400 },
    );
  }

  const alias = rawAlias.trim().toLowerCase();
  const profileName = typeof rawProfileName === "string" ? rawProfileName.trim().slice(0, 60) : "";
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
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Registration is temporarily unavailable" }, { status: 500 });
  }

  try {
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const hash = await bcrypt.hash(pin, 12);
    const { data, error } = await admin
      .from("users")
      .insert({ alias, pin_hash: hash, profile_name: profileName || null })
      .select("id, alias, profile_name")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "That alias is already taken" }, { status: 409 });
      }
      return NextResponse.json({ error: "Unable to create account right now" }, { status: 500 });
    }

    return NextResponse.json(
      { user: { id: data.id, alias: data.alias, profile_name: data.profile_name ?? null } },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Unable to create account right now" }, { status: 500 });
  }
}
