import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email } = (body as Record<string, unknown>) || {};
  if (typeof email !== "string") {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 },
    );
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
