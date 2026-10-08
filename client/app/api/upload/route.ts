import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

class UploadTooLargeError extends Error {}

async function readBoundedBody(request: Request): Promise<ArrayBuffer> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_UPLOAD_BYTES) {
    throw new UploadTooLargeError("Upload exceeds the 5 MB limit.");
  }

  if (!request.body) return new ArrayBuffer(0);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_UPLOAD_BYTES) {
        await reader.cancel();
        throw new UploadTooLargeError("Upload exceeds the 5 MB limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new ArrayBuffer(totalBytes);
  const bodyBytes = new Uint8Array(body);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
      return NextResponse.json(
        { error: "Expected a multipart form upload." },
        { status: 415 },
      );
    }
    if (!/;\s*boundary=/i.test(contentType)) {
      return NextResponse.json(
        { error: "The multipart boundary is missing." },
        { status: 400 },
      );
    }

    const body = await readBoundedBody(request);
    const boundedRequest = new Request(request.url, {
      method: "POST",
      headers: { "content-type": contentType },
      body,
    });
    let formData: FormData;
    try {
      formData = await boundedRequest.formData();
    } catch {
      return NextResponse.json(
        { error: "The multipart form data is invalid." },
        { status: 400 },
      );
    }
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Choose a file to upload." },
        { status: 400 },
      );
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Upload exceeds the 5 MB limit." },
        { status: 413 },
      );
    }

    const extension = path.extname(file.name).toLowerCase();
    const safeExtension = /^\.[a-z0-9]{1,10}$/.test(extension)
      ? extension
      : "";
    const filename = `${randomUUID()}${safeExtension}`;
    const uploadDirectory = path.join(process.cwd(), "uploads");
    const filePath = path.join(uploadDirectory, filename);
    const fileBytes = Buffer.from(await file.arrayBuffer());

    await mkdir(uploadDirectory, { recursive: true });
    await writeFile(filePath, fileBytes, { flag: "wx" });

    return NextResponse.json(
      { url: `/uploads/${filename}` },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof UploadTooLargeError) {
      return NextResponse.json({ error: error.message }, { status: 413 });
    }
    console.error("Upload failed:", error);
    return NextResponse.json(
      { error: "The file could not be uploaded." },
      { status: 500 },
    );
  }
}
