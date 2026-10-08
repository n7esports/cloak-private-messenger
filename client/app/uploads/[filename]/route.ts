import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const SAFE_FILENAME = /^[0-9a-f-]{36}(?:\.[a-z0-9]{1,10})?$/i;

export async function GET(
  _request: Request,
  context: { params: { filename: string } },
) {
  const { filename } = context.params;
  if (!SAFE_FILENAME.test(filename)) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  try {
    const filePath = path.join(process.cwd(), "uploads", filename);
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile() || fileInfo.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    const content = await readFile(filePath);
    const responseBody = new ArrayBuffer(content.byteLength);
    new Uint8Array(responseBody).set(content);
    return new Response(responseBody, {
      headers: {
        "content-type": "application/octet-stream",
        "content-disposition": `attachment; filename="${filename}"`,
        "content-length": String(content.byteLength),
        "x-content-type-options": "nosniff",
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }
    console.error("Uploaded file read failed:", error);
    return NextResponse.json(
      { error: "The uploaded file could not be read." },
      { status: 500 },
    );
  }
}
