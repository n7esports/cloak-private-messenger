import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

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
  const { pin_hash: _omitted, ...safeUser } = data;
  return NextResponse.json({ user: safeUser }, { status: 200 });
}