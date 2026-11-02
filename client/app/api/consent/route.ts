import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose/jwt/verify";
import { consentSchema } from "@/lib/validations/consent";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SESSION_SECRET = process.env.UQZERA_SESSION_SECRET;

/**
 * Lazily build the Supabase admin (service-role) client. Previously this was
 * created eagerly / with unsafe non-null assertions, so a missing env var on
 * the deployed preview crashed every POST /api/consent with an unhandled 500.
 */
let cachedAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.",
    );
  }
  if (!cachedAdmin) {
    // Consent rows must bypass RLS, so the service-role key is required here.
    cachedAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedAdmin;
}

export const runtime = "nodejs";

/**
 * Extract the user id from the signed session cookie using jose's constant-
 * time JWT verification. The previous implementation base64-decoded the
 * payload WITHOUT verifying the signature — any client could forge a user_id.
 * Verification failures are treated as anonymous, not as crashes.
 */
async function getUserIdFromSession(
  request: Request,
): Promise<string | undefined> {
  const token = request.cookies?.["uqzera_session"];
  if (!token || !SESSION_SECRET) return undefined;
  try {
    const key = new TextEncoder().encode(SESSION_SECRET);
    const { payload } = await jwtVerify(token, key);
    return typeof payload.sub === "string" ? payload.sub : undefined;
  } catch (error) {
    // Invalid/expired token → record the consent anonymously instead of crashing.
    console.error("API CRASH:", error);
    return undefined;
  }
}

/** POST /api/consent — log a consent grant to the consent_log table. */
export async function POST(request: Request) {
  try {
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

    const { kind, version, granted } = parsed.data;

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : undefined;

    const cookie = request.headers.get("cookie") || "";
    const match = cookie.match(/(?:^|; )anon_id=([^;]+)/);
    const anon_id = match ? decodeURIComponent(match[1]) : undefined;

    // --- jose token verification (guarded) ---
    let user_id: string | undefined;
    try {
      user_id = await getUserIdFromSession(request);
    } catch (error) {
      console.error("API CRASH:", error);
      user_id = undefined;
    }

    // --- Supabase admin client initialization (guarded) ---
    let admin: SupabaseClient;
    try {
      admin = getSupabaseAdmin();
    } catch (error) {
      console.error("API CRASH:", error);
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 },
      );
    }

    try {
      const { error } = await admin.from("consent_log").insert({
        kind,
        version,
        granted,
        ip: ip || null,
        user_id: user_id || null,
        anon_id: anon_id || null,
      });

      if (error) {
        console.error("API CRASH:", error);
        return NextResponse.json(
          { error: "Database insert failed", details: error.message },
          { status: 500 },
        );
      }
    } catch (err) {
      console.error("API CRASH:", err);
      return NextResponse.json(
        { error: "Database insert failed", details: String(err) },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("API CRASH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
