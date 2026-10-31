"use client";

import { useState } from "react";
import { useChatStore } from "../../store/useChatStore";

interface AcceptContactModalProps {
  open: boolean;
  senderEncryptionPubKey: string;
  packet: unknown;
  onClose: () => void;
}

export default function AcceptContactModal({ open, senderEncryptionPubKey, packet, onClose }: AcceptContactModalProps) {
  const [nickname, setNickname] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const acceptPendingRequest = useChatStore((s) => s.acceptPendingRequest);

  if (!open) return null;

  const handleSave = async () => {
    setError(null);
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("Enter a nickname.");
      return;
    }
    setSaving(true);
    try {
      await acceptPendingRequest(senderEncryptionPubKey, trimmed);
      setNickname("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept contact.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex w-full max-w-md flex-col rounded-lg border border-hairline bg-surface-container shadow-panel">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h3 className="font-sans text-base font-semibold text-on-surface">Accept Contact</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-surface-container hover:text-on-surface">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="p-5">
          <p className="text-xs text-on-surface-variant mb-3">New chat request from {senderEncryptionPubKey.substring(0, 8)}...</p>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-on-surface-variant">Nickname</span>
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="How you know them"
              className="w-full rounded-xl border border-hairline bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
            />
          </label>
          {error && <p className="mt-2 text-xs text-error">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Contact"}
          </button>
        </div>
      </div>
    </div>
  );
}
