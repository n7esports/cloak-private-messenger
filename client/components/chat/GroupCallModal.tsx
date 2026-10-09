"use client";

import { useState } from "react";
import { IconClose, IconPhone, IconShield, IconUsers } from "../icons/UiIcons";
import type { ChatSummary } from "../../store/useChatStore";

/**
 * Participant picker for a group call. Media transport is not wired up yet, so
 * this collects the invitees and reports them honestly rather than pretending a
 * conference bridge exists.
 */
export function GroupCallModal({
  chats,
  onStart,
  onClose,
}: {
  chats: ChatSummary[];
  onStart: (participantIds: string[]) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const candidates = chats.filter((chat) => chat.kind === "direct" && !chat.blocked);

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 px-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="New group call"
        className="cloak-glass-strong flex max-h-[80dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
            <IconUsers className="h-4 w-4 text-cloak-accent" />
            New group call
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            aria-label="Close group call picker"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <ul className="cloak-scroll mt-3 flex-1 space-y-1 overflow-y-auto">
          {candidates.length === 0 && (
            <li className="rounded-xl border border-white/5 px-3 py-4 text-center text-xs text-cloak-muted">
              No contacts available to invite.
            </li>
          )}
          {candidates.map((chat) => {
            const checked = selected.has(chat.id);
            return (
              <li key={chat.id}>
                <button
                  type="button"
                  onClick={() => toggle(chat.id)}
                  aria-pressed={checked}
                  className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border text-xs ${
                      checked
                        ? "border-cloak-accent bg-cloak-accent text-cloak-base"
                        : "border-white/20 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{chat.alias}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <p className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[11px] leading-5 text-cloak-muted">
          <IconShield className="h-3.5 w-3.5 shrink-0 text-cloak-accent" />
          Group media transport is not enabled yet; invites will be acknowledged
          but no call is bridged.
        </p>

        <button
          type="button"
          disabled={selected.size === 0}
          onClick={() => onStart([...selected])}
          className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cloak-accent px-4 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover disabled:opacity-40"
        >
          <IconPhone className="h-4 w-4" />
          Start call with {selected.size || "no"} {selected.size === 1 ? "person" : "people"}
        </button>
      </section>
    </div>
  );
}
