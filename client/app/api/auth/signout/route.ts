import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(sessionCookie.name, "", {
    httpOnly: true,
    secure: sessionCookie.secure,
    sameSite: sessionCookie.sameSite,
    path: sessionCookie.path,
    maxAge: 0,
    expires: new Date(0),
  });
  return response;
}
