"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { decodeBytes, encodeBytes } from "../../lib/protocol";
import type { ChatSummary } from "../../store/useChatStore";

interface NewChatModalProps {
  contacts: ChatSummary[];
  onClose: () => void;
  onContactSelected: (chat: ChatSummary) => void;
  onContactAdded: (alias: string, publicKey: string) => Promise<ChatSummary>;
  onOpenKeyExchange: () => void;
}

function parsePublicKey(value: string): string | null {
  const normalized = value.trim().replace(/^cloak:/i, "");
  if (/^[0-9a-f]{64}$/i.test(normalized)) {
    const bytes = Uint8Array.from(
      normalized.match(/.{2}/g) ?? [],
      (byte) => Number.parseInt(byte, 16),
    );
    return encodeBytes(bytes);
  }

  try {
    const bytes = decodeBytes(normalized);
    return bytes.length === 32 && encodeBytes(bytes) === normalized
      ? normalized
      : null;
  } catch {
    return null;
  }
}

export default function NewChatModal({
  contacts,
  onClose,
  onContactSelected,
  onContactAdded,
  onOpenKeyExchange,
}: NewChatModalProps) {
  const [query, setQuery] = useState("");
  const [alias, setAlias] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const matches = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return contacts
      .filter(
        (contact) =>
          contact.kind === "direct" &&
          (contact.id.toLocaleLowerCase().includes(normalizedQuery) ||
            contact.alias.toLocaleLowerCase().includes(normalizedQuery) ||
            contact.recipientPubKey.toLocaleLowerCase().includes(normalizedQuery)),
      )
      .slice(0, 8);
  }, [contacts, query]);

  const publicKey = parsePublicKey(query);
  const normalizedQuery = query.trim().replace(/^cloak:/i, "");
  const looksLikePublicKey =
    /^cloak:/i.test(query) ||
    (/^[0-9a-f]+$/i.test(normalizedQuery) && normalizedQuery.length > 40);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    inputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, []);

  async function startConversation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!publicKey) {
      setError(
        matches.length
          ? "Choose a contact from the matching contacts below."
          : "User not found. Cloak has no public username directory; enter a 64-character hexadecimal or 32-byte Base64 public key.",
      );
      return;
    }

    setWorking(true);
    try {
      const contact = await onContactAdded(alias, publicKey);
      onContactSelected(contact);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not create a conversation for this public key.",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4 py-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-chat-title"
        aria-describedby="new-chat-description"
        className="max-h-full w-full max-w-lg overflow-y-auto rounded-xl border border-cloak-border bg-cloak-surface-1 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="new-chat-title" className="text-lg font-semibold">
              New conversation
            </h2>
            <p
              id="new-chat-description"
              className="mt-2 text-sm leading-6 text-cloak-muted"
            >
              Search saved contacts, or add someone with their public encryption
              key. Cloak does not keep a central username directory.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new conversation"
            className="min-h-10 rounded-lg border border-cloak-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            Close
          </button>
        </div>

        <form onSubmit={startConversation} className="mt-5">
          <label htmlFor="new-chat-query" className="mb-2 block text-sm">
            User ID, username, peer ID, or public key
          </label>
          <input
            ref={inputRef}
            id="new-chat-query"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setError("");
            }}
            autoComplete="off"
            spellCheck={false}
            placeholder="Search contacts or paste a public key"
            className="w-full rounded-lg border border-cloak-border bg-cloak-base px-3 py-3 font-mono text-sm outline-none focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
          />

          {matches.length > 0 && (
            <div className="mt-3" aria-label="Matching saved contacts">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-cloak-muted">
                Saved contacts
              </p>
              <ul className="space-y-1">
                {matches.map((contact) => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onClick={() => onContactSelected(contact)}
                      className="w-full rounded-lg border border-cloak-border px-3 py-2 text-left hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
                    >
                      <span className="block text-sm font-medium">
                        {contact.alias}
                      </span>
                      <span className="mt-1 block truncate font-mono text-xs text-cloak-muted">
                        {contact.recipientPubKey}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {publicKey && (
            <>
              <p role="status" className="mt-3 text-sm text-cloak-accent">
                Valid 256-bit public key. Start a conversation securely.
              </p>
              <label htmlFor="new-chat-alias" className="mb-2 mt-4 block text-sm">
                Contact name <span className="text-cloak-muted">(optional)</span>
              </label>
              <input
                id="new-chat-alias"
                value={alias}
                onChange={(event) => setAlias(event.target.value)}
                autoComplete="off"
                maxLength={80}
                placeholder="e.g. Alex"
                className="w-full rounded-lg border border-cloak-border bg-cloak-base px-3 py-3 text-sm outline-none focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
              />
            </>
          )}

          {query.trim().length >= 3 && matches.length === 0 && !publicKey && (
            <p role="status" className="mt-3 text-sm text-cloak-muted">
              {looksLikePublicKey ? "Invalid public key or ID." : "User not found."}{" "}
              Cloak has no public username directory; verify the ID or paste
              the person&apos;s 64-character hexadecimal or 32-byte Base64
              public key.
            </p>
          )}

          {!query.trim() &&
            contacts.filter((contact) => contact.kind === "direct").length === 0 && (
            <p className="mt-4 text-sm text-cloak-muted">
              No saved contacts yet. Paste a public key to start the first
              conversation.
            </p>
            )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-cloak-danger">
              {error}
            </p>
          )}

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onOpenKeyExchange}
              className="mr-auto min-h-11 rounded-lg border border-cloak-border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            >
              Use QR / share key
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 rounded-lg border border-cloak-border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!publicKey || working}
              className="min-h-11 rounded-lg bg-cloak-accent px-4 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {working ? "Starting…" : "Start Conversation"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
