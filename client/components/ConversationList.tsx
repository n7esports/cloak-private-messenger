"use client";

import { useState } from "react";
import { useChatStore } from "../store/useChatStore";

export function ConversationList({
  activeChatId,
  onSelectChat,
}: {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
}) {
  const chats = useChatStore((s) => s.chats);
  const pendingRequests = useChatStore((s) => s.pendingRequests);
  const addContact = useChatStore((s) => s.addContact);
  const [newAlias, setNewAlias] = useState("");
  const [newKey, setNewKey] = useState("");

  return (
    <div className="flex h-full flex-col border-r border-zinc-800/60 bg-zinc-950/40">
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-serif text-lg font-semibold tracking-tight text-zinc-100">
          Cloak
        </h2>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="text-xs uppercase tracking-widest text-zinc-400">Encrypted</span>
        </div>
      </div>

      <div className="px-3 py-2">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newAlias.trim() || !newKey.trim()) return;
            await addContact(newAlias.trim(), newKey.trim());
            setNewAlias("");
            setNewKey("");
          }}
          className="flex gap-2"
        >
          <input
            value={newAlias}
            onChange={(e) => setNewAlias(e.target.value)}
            placeholder="Alias"
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-crimson/60"
          />
          <input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Public key"
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-crimson/60"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Add
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {chats.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">
            No conversations yet. Add a contact to start.
          </p>
        )}
        {chats.map((chat) => (
          <button
            key={chat.id}
            onClick={() => onSelectChat(chat.id)}
            className={`w-full rounded-xl px-3 py-3 text-left transition ${
              activeChatId === chat.id
                ? "glass-panel"
                : "hover:bg-zinc-900/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-100">{chat.alias}</span>
              {chat.kind === "notes" && (
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                  Notes
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
              {chat.unreadCount > 0 && (
                <span className="rounded-full bg-crimson/20 px-2 py-0.5 text-crimson">
                  {chat.unreadCount}
                </span>
              )}
              <span className="truncate">
                {chat.recipientPubKey
                  ? chat.recipientPubKey.slice(0, 16) + "..."
                  : "Local notes"}
              </span>
            </div>
          </button>
        ))}
      </div>

      {pendingRequests.length > 0 && (
        <div className="border-t border-zinc-800/60 px-3 py-3">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            Pending requests
          </p>
          {pendingRequests.map((req) => (
            <div
              key={req.senderEncryptionPubKey}
              className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2"
            >
              <p className="text-xs text-zinc-300">
                {req.senderPubKey.slice(0, 32)}...
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
