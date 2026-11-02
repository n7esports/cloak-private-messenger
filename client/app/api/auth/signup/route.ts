import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Lazily build the Supabase admin (service-role) client so a missing env var
 * produces a clean, logged 500 JSON response instead of an unhandled crash.
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
    // blocked by RLS and cannot write to the users table.
    cachedAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cachedAdmin;
}

export const runtime = "nodejs";

/** POST /api/auth/signup — create a user (alias + bcrypt-hashed PIN). */
export async function POST(request: Request) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { alias, pin, profileName } = (body as Record<string, unknown>) || {};
    if (typeof alias !== "string" || typeof pin !== "string") {
      return NextResponse.json(
        { error: "alias and pin are required" },
        { status: 400 },
      );
    }
    if (alias.trim().length === 0 || pin.length < 6) {
      return NextResponse.json(
        { error: "alias cannot be empty and pin must be at least 6 characters" },
        { status: 400 },
      );
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

    let hash: string;
    try {
      hash = await bcrypt.hash(pin, 10);
    } catch (error) {
      console.error("API CRASH:", error);
      return NextResponse.json(
        { error: "Failed to hash credentials" },
        { status: 500 },
      );
    }

    // Schema (20261031_create_users_alias_pin.sql): id, alias, pin_hash,
    // profile_name, created_at. The old code dropped profileName on the floor.
    let data: Record<string, unknown> | null;
    let insertError: { message: string } | null;
    try {
      const result = await admin
        .from("users")
        .insert({
          alias: alias.trim(),
          pin_hash: hash,
          profile_name:
            typeof profileName === "string" && profileName.trim()
              ? profileName.trim()
              : null,
        })
        .select("id, alias, profile_name, created_at")
        .single();
      data = (result.data as Record<string, unknown> | null) ?? null;
      insertError = result.error as { message: string } | null;
    } catch (error) {
      console.error("API CRASH:", error);
      return NextResponse.json(
        { error: "Database insert failed" },
        { status: 500 },
      );
    }

    if (insertError) {
      // Unique-violation on alias should surface as a friendly 409/400, not a crash.
      const conflict = insertError.message.toLowerCase().includes("duplicate");
      return NextResponse.json(
        { error: conflict ? "alias already taken" : insertError.message },
        { status: conflict ? 409 : 400 },
      );
    }

    return NextResponse.json({ user: data }, { status: 200 });
  } catch (error) {
    console.error("API CRASH:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
