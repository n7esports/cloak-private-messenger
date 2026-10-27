"use client";

import { useChatStore } from "../store/useChatStore";
import { useState, useMemo } from "react";

type Tab = "all" | "unread" | "channels";

export function MessagesView({
  activeChatId,
  onSelectChat,
  onNavigateToChannels,
}: {
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onNavigateToChannels?: () => void;
}) {
  const chats = useChatStore((s) => s.chats);
  const channels = useChatStore((s) => s.channels);
  const globalSearch = useChatStore((s) => s.globalSearch);
  const setGlobalSearch = useChatStore((s) => s.setGlobalSearch);
  const [tab, setTab] = useState<Tab>("all");

  const filtered = useMemo(() => {
    const term = globalSearch.trim().toLowerCase();
    let list = chats;
    if (tab === "unread") list = list.filter((c) => (c.unreadCount || 0) > 0);
    if (term) list = list.filter((c) => c.alias.toLowerCase().includes(term));
    return list;
  }, [chats, tab, globalSearch]);

  return (
    <div className="flex h-full w-full flex-col border-r border-zinc-800/60 bg-zinc-950/40">
      {/* Brand */}
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="font-serif text-lg font-semibold tracking-tight text-zinc-100">
          Cloak
        </h2>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="text-[10px] uppercase tracking-widest text-zinc-400">
            Encrypted
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <input
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Search conversations..."
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-crimson/60"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar px-3 pb-2">
        {(["all", "unread", "channels"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === t
                ? "bg-[#262a34] text-[#4edea3] shadow-sm"
                : "text-zinc-300 hover:bg-[#1c1f29] hover:text-white"
            }`}
          >
            {t === "all" ? "All Encrypted" : t === "unread" ? "Unread" : "Mesh Channels"}
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2">
        {tab !== "channels" && filtered.length === 0 && (
          <p className="px-2 py-6 text-center text-sm text-zinc-500">
            No conversations found.
          </p>
        )}
        {tab !== "channels" &&
          filtered.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onSelectChat(chat.id)}
              className={`w-full rounded-xl px-3 py-3 text-left transition ${
                activeChatId === chat.id
                  ? "bg-[#262a34] border border-zinc-700/50"
                  : "hover:bg-zinc-900/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-zinc-100 truncate">
                  {chat.alias}
                </span>
                <div className="flex items-center gap-2">
                  {chat.unreadCount > 0 && (
                    <span className="rounded-full bg-crimson/20 px-2 py-0.5 text-[10px] font-medium text-crimson">
                      {chat.unreadCount}
                    </span>
                  )}
                  {chat.online && (
                    <span className="h-2 w-2 rounded-full bg-emerald shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  )}
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                <span className="truncate">
                  {chat.recipientPubKey
                    ? chat.recipientPubKey.slice(0, 16) + "..."
                    : "Local notes"}
                </span>
              </div>
            </button>
          ))}

        {tab === "channels" && (
          <div className="flex flex-col gap-2">
            {channels.length === 0 && (
              <p className="px-2 py-4 text-center text-xs text-zinc-600">
                No mesh channels joined.
              </p>
            )}
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="rounded-xl border border-zinc-800/50 bg-zinc-900/60 p-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-zinc-400">
                      {ch.icon}
                    </span>
                    <span className="text-sm font-medium text-zinc-200">
                      {ch.name}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                    {ch.memberCount.toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-zinc-400 truncate">
                  {ch.lastSnippet}
                </p>
              </div>
            ))}
            <button
              onClick={onNavigateToChannels}
              className="mt-2 rounded-xl border border-dashed border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:border-crimson/60 hover:text-crimson"
            >
              + Join or create channel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
