"use client";

import { useState } from "react";
import { IconForward, IconSearch } from "../icons/UiIcons";
import { Sheet, SheetBody, SheetHeader } from "./Sheet";
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
    <Sheet open onClose={onClose} variant="center" label="Forward message">
      <SheetHeader
        title="Forward to"
        onClose={onClose}
        icon={<IconForward className="h-4 w-4 shrink-0 text-cloak-accent" />}
      />
      <div className="shrink-0 px-5">
        <div className="cloak-glass-soft mt-3 flex items-center gap-2 rounded-xl px-3">
          <IconSearch className="h-4 w-4 shrink-0 text-cloak-dim" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search contacts"
            aria-label="Search contacts"
            className="min-h-10 w-full bg-transparent text-sm outline-none placeholder:text-cloak-dim"
          />
        </div>
      </div>
      <SheetBody className="px-5 pb-5">
        <ul className="mt-3 space-y-1">
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
      </SheetBody>
    </Sheet>
  );
}
