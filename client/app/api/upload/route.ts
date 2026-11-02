import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
]);

// shortcut: virus scan is a stub; swap in a real scanner when the backend exists.
async function virusScanStub(_data: ArrayBuffer): Promise<boolean> {
  return Promise.resolve(true);
}

async function sign(payload: string): Promise<string> {
  const secret = process.env.UPLOAD_HMAC_SECRET;
  if (!secret) {
    throw new Error("UPLOAD_HMAC_SECRET is not configured");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Buffer.from(sig).toString("hex");
}

// Loose End 3: verify the app's HttpOnly session cookie (same jose verification
// logic as middleware.ts) instead of a Supabase Auth Bearer token.
async function hasValidSession(request: Request): Promise<boolean> {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)uqzera_session=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : undefined;
  if (!token) return false;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) return false; // fail closed if misconfigured
  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      issuer: "uqzera",
      audience: "uqzera-web",
    });
    return true;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    // F-06 fix: require a valid authenticated session before accepting uploads.
    if (!(await hasValidSession(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await request.formData();
    const file = form.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: `File exceeds 5 MB limit (${(file.size / 1024 / 1024).toFixed(1)} MB)` },
        { status: 413 }
      );
    }

    const mime = file.type.toLowerCase();
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json(
        { error: `MIME type ${mime} is not allowed` },
        { status: 415 }
      );
    }

    const buffer = await file.arrayBuffer();
    const clean = await virusScanStub(buffer);
    if (!clean) {
      return NextResponse.json({ error: "File failed virus scan" }, { status: 422 });
    }

    const base64 = Buffer.from(buffer).toString("base64");
    const dataUrl = `data:${mime};base64,${base64}`;
    const payload = JSON.stringify({ name: file.name, mime, size: file.size, ts: Date.now() });
    const signature = await sign(payload);

    return NextResponse.json({
      signedUrl: dataUrl,
      name: file.name,
      mime,
      size: file.size,
      signature,
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
