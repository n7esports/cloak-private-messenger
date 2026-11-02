import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

export async function POST(request: Request) {
  try {
    // F-06 fix: require a valid authenticated session before accepting uploads.
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      // Fail closed: cannot verify the session without Supabase config.
      return NextResponse.json({ error: "Upload service unavailable" }, { status: 503 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) {
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
