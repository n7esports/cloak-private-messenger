import { NextResponse } from "next/server";
import { database } from "@/lib/vault";

// GET /api/data/export — returns all local vault data as JSON.
// The caller must hold the vault; this endpoint only reads the already-encrypted
// IndexedDB rows (ciphertext + nonce), so no plaintext leaves the device here.
export async function GET() {
  try {
    const chats = await database.chats.toArray();
    const messages = await database.messages.toArray();
    const sessions = await database.sessions.toArray();
    const notes = await database.notes.toArray();
    const outbox = await database.outbox.toArray();

    return NextResponse.json(
      {
        exportedAt: new Date().toISOString(),
        chats,
        messages,
        sessions,
        notes,
        outbox,
      },
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": "attachment; filename=cloak-export.json",
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: "Export failed", details: String(error) },
      { status: 500 }
    );
  }
}
