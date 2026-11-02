import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { SignJWT } from "jose";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Loose End 1 (F-02): issue a real server-side session on successful sign-in.
function getSessionSecret(): Uint8Array | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return null; // fail closed if misconfigured
  return new TextEncoder().encode(secret);
}

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { alias, pin } = (body as Record<string, unknown>) || {};
  if (typeof alias !== "string" || typeof pin !== "string") {
    return NextResponse.json({ error: "alias and pin are required" }, { status: 400 });
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return NextResponse.json({ error: "missing service key" }, { status: 500 });
  const admin = createClient(supabaseUrl, serviceKey);
  // Fetch pin_hash for comparison only; never return it to the client (F-01).
  const { data, error } = await admin.from("users").select("id, alias, profile_name, created_at, pin_hash").eq("alias", alias).single();
  if (error || !data) return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  const ok = await bcrypt.compare(pin, data.pin_hash);
  if (!ok) return NextResponse.json({ error: "invalid credentials" }, { status: 401 });
  const secret = getSessionSecret();
  if (!secret) return NextResponse.json({ error: "session misconfigured" }, { status: 500 });
  // Signed, HttpOnly session cookie. The client never sees pin_hash (F-01 preserved).
  const token = await new SignJWT({ uid: String(data.id), alias: String(data.alias) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("uqzera")
    .setAudience("uqzera-web")
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  const { pin_hash: _omitted, ...safeUser } = data;
  const response = NextResponse.json({ user: safeUser }, { status: 200 });
  response.cookies.set("uqzera_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}