import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { jwtVerify } from "jose/jwt/verify";
import { consentSchema } from "@/lib/validations/consent";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SESSION_SECRET = process.env.UQZERA_SESSION_SECRET;

let cachedAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable.",
    );
  }
  if (!cachedAdmin) {
    cachedAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedAdmin;
}

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

    let user_id: string | undefined;
    try {
      const cookieStore = cookies();
      const token = cookieStore.get("uqzera_session")?.value;
      if (token) {
        try {
          const key = await getSessionKey();
          const { payload } = await jwtVerify(token, key);
          user_id = typeof payload.sub === "string" ? payload.sub : undefined;
        } catch {
          // ignore invalid token
        }
      }
    } catch (error) {
      console.error("API CRASH:", error);
      user_id = undefined;
    }

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
