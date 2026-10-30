import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, dob } = (body as Record<string, unknown>) || {};
  if (typeof email !== "string" || typeof password !== "string" || typeof dob !== "string") {
    return NextResponse.json(
      { error: "email, password, and dob are required" },
      { status: 400 },
    );
  }

  const birthDate = new Date(dob);
  if (Number.isNaN(birthDate.getTime())) {
    return NextResponse.json({ error: "Invalid DOB" }, { status: 400 });
  }
  const age = Math.floor(
    (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  if (age < 16) {
    return NextResponse.json(
      { error: "You must be at least 16 years old." },
      { status: 403 },
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { dob } },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data.user }, { status: 200 });
}
