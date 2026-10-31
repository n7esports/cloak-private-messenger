import { database, wipeVaultDatabase } from "./vault";

/**
 * Download the encrypted local records from this browser.
 * The device wrapping key is deliberately excluded from the export.
 */
export async function downloadEncryptedVaultExport(): Promise<void> {
  await database.open();

  const [chats, messages, sessions, notes, outbox, flags] = await Promise.all([
    database.chats.toArray(),
    database.messages.toArray(),
    database.sessions.toArray(),
    database.notes.toArray(),
    database.outbox.toArray(),
    database.flags.toArray(),
  ]);

  const exportData = {
    format: "uqzera-encrypted-vault-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    encryption: "Encrypted local records; device wrapping key is not included.",
    chats,
    messages,
    sessions,
    notes,
    outbox,
    flags,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `UQZERA-encrypted-export-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export async function deleteLocalVaultData(): Promise<void> {
  await wipeVaultDatabase();
}
