import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SESSION_SECRET = process.env.UQZERA_SESSION_SECRET;

/**
 * Lazily build the Supabase admin (service-role) client. Creating it at
 * module scope crashed the whole route with an unhandled 500 whenever
 * NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY was missing on the
 * deployment — now we return a clean 500 JSON response instead and log the
 * exact failure reason to the server logs.
 */
let cachedAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.",
    );
  }
  if (!cachedAdmin) {
    // The admin client MUST use SUPABASE_SERVICE_ROLE_KEY — the anon key is
    // blocked by RLS on the users table and would silently break sign-in.
    cachedAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedAdmin;
}

/** HS256 secret for signing/verifying session tokens. */
async function getSessionKey(): Promise<Uint8Array> {
  if (!SESSION_SECRET) {
    throw new Error("Missing UQZERA_SESSION_SECRET environment variable.");
  }
  if (SESSION_SECRET.length < 32) {
    throw new Error(
      `UQZERA_SESSION_SECRET is too short (${SESSION_SECRET.length} chars); minimum is 32.`,
    );
  }
  return new TextEncoder().encode(SESSION_SECRET);
}

export const runtime = "nodejs";

/** POST /api/auth/signin — verify alias + PIN, issue a signed session JWT. */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { alias, pin } = (body as Record<string, unknown>) || {};
    if (typeof alias !== "string" || typeof pin !== "string") {
      return NextResponse.json(
        { error: "alias and pin are required" },
        { status: 400 },
      );
    }

    // --- Supabase admin client initialization (guarded) ---
    let admin: SupabaseClient;
    try {
      admin = getSupabaseAdmin();
    } catch (error) {
      console.error("SIGNIN ERROR: Supabase admin init failed:", error);
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 },
      );
    }

    let data: Record<string, unknown> | null;
    let queryError: { message: string } | null;
    try {
      const result = await admin
        .from("users")
        .select("id, alias, pin_hash, profile_name, created_at")
        .eq("alias", alias)
        .single();
      data = (result.data as Record<string, unknown> | null) ?? null;
      queryError = result.error as { message: string } | null;
    } catch (error) {
      console.error("SIGNIN ERROR: Database query failed:", error);
      return NextResponse.json(
        { error: "Database query failed" },
        { status: 500 },
      );
    }

    if (queryError || !data) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    const pinHash = data.pin_hash;
    if (typeof pinHash !== "string") {
      console.error(
        "SIGNIN ERROR: users row is missing pin_hash — did the database rebuild run all migrations?",
      );
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 },
      );
    }

    let ok: boolean;
    try {
      ok = await bcrypt.compare(pin, pinHash);
    } catch (error) {
      console.error("SIGNIN ERROR: Password check failed:", error);
      return NextResponse.json(
        { error: "Password check failed" },
        { status: 500 },
      );
    }
    if (!ok) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
    }

    // --- jose session token signing (guarded) ---
    let token: string;
    try {
      const key = await getSessionKey();
      token = await new SignJWT({
        sub: String(data.id),
        alias: String(data.alias),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(key);
    } catch (error) {
      console.error("SIGNIN ERROR: Failed to sign session token:", error);
      return NextResponse.json(
        { error: "Failed to sign session token" },
        { status: 500 },
      );
    }

    // Never leak the password hash to the client.
    const { pin_hash: _secret, ...safeUser } = data;
    const response = NextResponse.json({ user: safeUser }, { status: 200 });
    try {
      response.cookies.set("uqzera_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    } catch (error) {
      console.error("SIGNIN ERROR: Failed to set session cookie:", error);
    }
    return response;
  } catch (error) {
    console.error("SIGNIN ERROR: Unhandled route crash:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** GET /api/auth/signin — verify the current session cookie (auth-state check). */
export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get("uqzera_session")?.value;
    if (!token) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    // --- jose token verification (guarded) ---
    let payload: { sub?: string; alias?: string };
    try {
      const key = await getSessionKey();
      const verified = await jwtVerify(token, key);
      payload = verified.payload as { sub?: string; alias?: string };
    } catch (error) {
      console.error("SIGNIN ERROR: Session verification failed:", error);
      return NextResponse.json(
        { user: null, error: "invalid session" },
        { status: 401 },
      );
    }

    return NextResponse.json(
      { user: { id: payload.sub ?? null, alias: payload.alias ?? null } },
      { status: 200 },
    );
  } catch (error) {
    console.error("SIGNIN ERROR: Unhandled GET crash:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
