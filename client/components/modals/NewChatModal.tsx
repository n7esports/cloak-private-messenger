"use client";

import { useState, useMemo } from "react";
import IconX from "../icons/IconX";

type Tab = "search" | "addkey";

const MOCK_CONTACTS = [
  { id: "1", alias: "Alice", pubKey: "abc123" },
  { id: "2", alias: "Bob", pubKey: "def456" },
  { id: "3", alias: "Charlie", pubKey: "ghi789" },
  { id: "4", alias: "Dana", pubKey: "jkl012" },
  { id: "5", alias: "Eli", pubKey: "mno345" },
];

export default function NewChatModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [publicKey, setPublicKey] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);

  const contacts = useMemo(() => {
    if (!searchQuery.trim()) return MOCK_CONTACTS;
    const q = searchQuery.trim().toLowerCase();
    return MOCK_CONTACTS.filter((c) => c.alias.toLowerCase().includes(q));
  }, [searchQuery]);

  const handleAddByKey = () => {
    setError(null);
    const trimmed = publicKey.trim();
    if (!trimmed) {
      setError("Enter a public key.");
      return;
    }
    if (!nickname.trim()) {
      setError("Enter a nickname.");
      return;
    }
    onClose();
  };

  const handleStartChat = (alias: string) => {
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex w-full max-w-md flex-col rounded-2xl border border-hairline bg-surface-container shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h3 className="font-sans text-base font-semibold text-on-surface">New Chat</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-surface hover:text-on-surface">
            <IconX size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-hairline px-4">
          <button
            onClick={() => setTab("search")}
            className={`flex-1 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              tab === "search"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Search Contacts
          </button>
          <button
            onClick={() => setTab("addkey")}
            className={`flex-1 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
              tab === "addkey"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Add by Public Key
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {tab === "search" && (
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full rounded-xl border border-hairline bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
                autoFocus
              />
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {contacts.length === 0 && (
                  <p className="py-4 text-center text-xs text-on-surface-variant">No contacts found.</p>
                )}
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleStartChat(contact.alias)}
                    className="flex items-center gap-3 rounded-xl border border-hairline bg-surface px-4 py-3 text-left transition hover:border-primary"
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-high">
                      <span className="text-xs font-semibold text-on-surface">
                        {contact.alias.slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-on-surface">{contact.alias}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "addkey" && (
            <div className="flex flex-col gap-4">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-on-surface-variant">Contact Public Key</span>
                <textarea
                  value={publicKey}
                  onChange={(e) => setPublicKey(e.target.value)}
                  placeholder="Paste public key here..."
                  rows={3}
                  className="w-full rounded-xl border border-hairline bg-surface-container px-3 py-2.5 font-mono text-xs text-on-surface outline-none focus:border-primary resize-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-on-surface-variant">Nickname</span>
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="How you know them"
                  className="w-full rounded-xl border border-hairline bg-surface-container px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
                />
              </label>
              {error && <p className="text-xs text-error">{error}</p>}
              <button
                onClick={handleAddByKey}
                className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-on-primary transition hover:bg-primary/90"
              >
                Add Contact
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
