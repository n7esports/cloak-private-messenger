import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";

const MAX_ATTACHMENT_BYTES = 700 * 1024;
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
]);

function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("cloak_session="));

  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice("cloak_session=".length));
  } catch {
    return null;
  }
}

async function matchesDeclaredMime(file: File): Promise<boolean> {
  const declaredMime = file.type.toLowerCase();
  if (!ALLOWED_MIME.has(declaredMime)) return false;

  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());

  if (declaredMime === "image/png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (declaredMime === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (declaredMime === "image/webp") {
    return (
      bytes.length >= 12 &&
      String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
    );
  }

  try {
    const text = await file.text();
    new TextEncoder().encode(text);
    return !text.includes("\u0000") && !/[\u0001-\u0008\u000b\u000c\u000e-\u001f]/.test(text);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const session = await verifySessionToken(getSessionToken(request));
  if (!session) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_ATTACHMENT_BYTES + 128 * 1024) {
    return NextResponse.json({ error: "File exceeds the 700 KiB limit" }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "File must be between 1 byte and 700 KiB" }, { status: 413 });
  }

  if (!(await matchesDeclaredMime(file))) {
    return NextResponse.json(
      { error: "Only valid PNG, JPEG, WebP, and plain-text files are allowed" },
      { status: 415 },
    );
  }

  const hmacSecret = process.env.UPLOAD_HMAC_SECRET;
  if (!hmacSecret || new TextEncoder().encode(hmacSecret).byteLength < 32) {
    return NextResponse.json({ error: "Upload signing is not configured" }, { status: 503 });
  }

  // No real malware scanner is configured in this deployment. Fail closed:
  // do not return a data URL, signature, or any accepted/stored upload.
  return NextResponse.json(
    { error: "Uploads are temporarily disabled until malware scanning is configured" },
    { status: 501 },
  );
}
