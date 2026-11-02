"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useChatStore, type ChatState, type ChatSummary } from "../../store/useChatStore";
import IconChat from "../icons/IconChat";
import IconStar from "../icons/IconStar";
import IconTrash2 from "../icons/IconTrash2";
import IconUsers from "../icons/IconUsers";
import IconSearch from "../icons/IconSearch";
import IconX from "../icons/IconX";
import IconPlus from "../icons/IconPlus";
import AddContactModal from "../modals/AddContactModal";
import AcceptContactModal from "../modals/AcceptContactModal";
import { useVaultStore } from "../../store/useVaultStore";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "favourites", label: "Favourites" },
  { id: "groups", label: "Groups" },
] as const;

type Filter = (typeof FILTERS)[number]["id"];

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function AppShell({ onOpenIdentity }: { onOpenIdentity?: () => void }) {
  const chats = useChatStore((s: ChatState) => s.chats);
  const activeChatId = useChatStore((s: ChatState) => s.activeChatId);
  const setActiveChat = useChatStore((s: ChatState) => s.setActiveChat);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [acceptRequest, setAcceptRequest] = useState<{ senderKey: string; packet: unknown } | null>(null);
  const pendingRequests = useChatStore((s: ChatState) => s.pendingRequests);
  const dismissPendingRequest = useChatStore((s: ChatState) => s.dismissPendingRequest);
  const isUnlocked = useVaultStore((s) => s.isUnlocked);
  const loadChats = useChatStore((s: ChatState) => s.loadChats);

  useEffect(() => {
    if (isUnlocked) void loadChats().catch(() => {});
  }, [isUnlocked, loadChats]);

  const filtered = useMemo(() => {
    let list = [...chats];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((c) => c.alias.toLowerCase().includes(q));
    }
    if (filter === "unread") list = list.filter((c) => c.unreadCount > 0);
    if (filter === "favourites") list = list.filter((c) => c.pinned);
    return list.sort(
      (a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
    );
  }, [chats, filter, searchQuery]);

  return (
    <aside className="flex h-screen w-full flex-col bg-surface-container overflow-x-hidden">
      {/* Search */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-1.5">
          <IconSearch size={16} className="text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chats..."
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      {/* Filter chips */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === f.id
                ? "bg-primary text-on-primary"
                : "bg-surface border border-hairline text-text-secondary hover:text-text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="px-4 pb-2">
          {pendingRequests.map((req) => (
            <div key={req.senderEncryptionPubKey} className="mb-2 rounded-lg border border-hairline bg-surface-container p-3">
              <p className="text-xs text-on-surface">New chat request from {req.senderEncryptionPubKey.substring(0, 8)}...</p>
              <div className="mt-2 flex gap-2">
                <button onClick={() => setAcceptRequest({ senderKey: req.senderEncryptionPubKey, packet: req.packet })} className="rounded bg-primary px-2 py-1 text-xs text-on-primary">Accept</button>
                <button onClick={() => dismissPendingRequest(req.senderEncryptionPubKey)} className="rounded border border-hairline px-2 py-1 text-xs text-on-surface">Dismiss</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chats header */}
      <div className="px-4 py-2 flex items-center justify-between">
        <span className="text-sm font-semibold">Chats</span>
        <button onClick={() => setShowAddContact(true)} className="rounded-lg p-1.5 hover:bg-surface-high">
          <IconPlus size={16} />
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center px-4 py-8 text-center text-xs text-on-surface-variant">
            No conversations found
          </div>
        ) : (
          filtered.map((chat) => {
            const preview = chat.kind === "notes" ? "Private Notes" : chat.alias;
            return (
              <button
                key={chat.id}
                onClick={() => setActiveChat(chat.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                  activeChatId === chat.id ? "bg-[#059669]" : "hover:bg-surface"
                }`}
              >
                <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-high">
                  <span className="text-sm font-semibold text-on-surface">
                    {chat.alias.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-container bg-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-on-surface">{chat.alias}</span>
                    <span className="flex-shrink-0 text-[10px] text-on-surface-variant">{formatTime(chat.updatedAt)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-on-surface-variant">{preview}</span>
                    {chat.unreadCount > 0 && (
                      <span className="flex-shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-on-primary">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <AddContactModal open={showAddContact} onClose={() => setShowAddContact(false)} />
      <AcceptContactModal
        open={!!acceptRequest}
        senderEncryptionPubKey={acceptRequest?.senderKey || ""}
        packet={acceptRequest?.packet || null}
        onClose={() => setAcceptRequest(null)}
      />
    </aside>
  );
}
