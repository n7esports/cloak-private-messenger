"use client";

import { useState } from "react";
import { IconClose, IconForward, IconSearch } from "../icons/UiIcons";
import type { ChatSummary } from "../../store/useChatStore";

/**
 * Forward target picker. Shows every direct conversation except the current
 * one; selecting a target forwards the message content into that thread.
 */
export function ForwardPicker({
  chats,
  currentChatId,
  onForward,
  onClose,
}: {
  chats: ChatSummary[];
  currentChatId: string;
  onForward: (targetChatId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const targets = chats.filter(
    (chat) =>
      chat.kind === "direct" &&
      chat.id !== currentChatId &&
      !chat.blocked &&
      (chat.alias.toLowerCase().includes(query.trim().toLowerCase()) ||
        chat.recipientPubKey.includes(query.trim())),
  );

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 px-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Forward message"
        className="cloak-glass-strong flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
            <IconForward className="h-4 w-4 text-cloak-accent" />
            Forward to
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            aria-label="Close forward picker"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="cloak-glass-soft mt-4 flex items-center gap-2 rounded-xl px-3">
          <IconSearch className="h-4 w-4 shrink-0 text-cloak-dim" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contacts"
            aria-label="Search contacts"
            className="min-h-10 w-full bg-transparent text-sm outline-none placeholder:text-cloak-dim"
          />
        </div>

        <ul className="cloak-scroll mt-3 flex-1 space-y-1 overflow-y-auto">
          {targets.length === 0 && (
            <li className="rounded-xl border border-white/5 px-3 py-4 text-center text-xs text-cloak-muted">
              No other conversations to forward to.
            </li>
          )}
          {targets.map((chat) => (
            <li key={chat.id}>
              <button
                type="button"
                onClick={() => onForward(chat.id)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cloak-accent/15 text-xs font-semibold text-cloak-accent"
                  aria-hidden="true"
                >
                  {chat.alias.trim().slice(0, 1).toUpperCase() || "?"}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{chat.alias}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
