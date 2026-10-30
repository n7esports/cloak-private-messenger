import { NextResponse } from "next/server";
import { consentSchema } from "@/lib/validations/consent";

export async function POST(request: Request) {
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
      { status: 400 }
    );
  }

  const { kind, version, granted } = parsed.data;

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : undefined;

  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|; )anon_id=([^;]+)/);
  const anon_id = match ? decodeURIComponent(match[1]) : undefined;

  const authHeader = request.headers.get("authorization");
  const bearerMatch = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  let user_id: string | undefined;
  if (bearerMatch) {
    const payload = bearerMatch.split(".")[1];
    if (payload) {
      try {
        const decoded = JSON.parse(
          Buffer.from(payload, "base64url").toString("utf8")
        );
        user_id = decoded.sub;
      } catch {
        // ignore invalid token
      }
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const insertBody: Record<string, unknown> = {
    kind,
    version,
    granted,
    ip: ip || null,
    user_id: user_id || null,
    anon_id: anon_id || null,
  };

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/consent_log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify(insertBody),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "Database insert failed", details: text },
        { status: 500 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Database insert failed", details: String(err) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
