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
  const hash = await bcrypt.hash(pin, 10);
  const { data, error } = await admin.from("users").insert({ alias, pin_hash: hash }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: data }, { status: 200 });
}