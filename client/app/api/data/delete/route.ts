import { NextResponse } from "next/server";
import { database } from "@/lib/vault";

// POST /api/data/delete — wipes all local vault data.
// Requires a confirmation token to prevent accidental calls.
export async function POST(request: Request) {
  let body: { confirm?: string } = {};
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.confirm !== "DELETE_ALL_DATA") {
    return NextResponse.json(
      { error: "Missing confirmation. Send { confirm: 'DELETE_ALL_DATA' }." },
      { status: 400 }
    );
  }

  try {
    await database.chats.clear();
    await database.messages.clear();
    await database.sessions.clear();
    await database.notes.clear();
    await database.outbox.clear();
    return NextResponse.json({ ok: true, deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Deletion failed", details: String(error) },
      { status: 500 }
    );
  }
}
