import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/** POST /api/auth/logout — clears the uqzera_session HttpOnly cookie. */
export async function POST() {
  // Next.js 14: cookies() is synchronous in Route Handlers (no await).
  cookies().set("uqzera_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}
