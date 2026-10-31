"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useChatStore, type ChatState, type ChatSummary } from "../../store/useChatStore";
import IconChat from "../icons/IconChat";
import IconChannel from "../icons/IconChannel";
import IconTrash from "../icons/IconTrash";
import IconBellOff from "../icons/IconBellOff";
import IconX from "../icons/IconX";
import IconPlus from "../icons/IconPlus";
import IconSearch from "../icons/IconSearch";
import IconSettings from "../icons/IconSettings";
import AddContactModal from "../modals/AddContactModal";
import { useVaultStore } from "../../store/useVaultStore";

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

export default function AppShell({ onOpenIdentity }: { onOpenIdentity?: () => void }) {
  const chats = useChatStore((s: ChatState) => s.chats);
  const activeChatId = useChatStore((s: ChatState) => s.activeChatId);
  const setActiveChat = useChatStore((s: ChatState) => s.setActiveChat);
  const sorted = useMemo(
    () =>
      [...chats].sort(
        (a, b) =>
          Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt,
      ),
    [chats],
  );

  const initials = (alias: string) =>
    alias
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const clearChatMessages = useChatStore((s: ChatState) => s.clearChatMessages);
  const deleteChat = useChatStore((s: ChatState) => s.deleteChat);
  const updateChat = useChatStore((s: ChatState) => s.updateChat);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; chatId: string } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [showAddContact, setShowAddContact] = useState(false);
  const isUnlocked = useVaultStore((s) => s.isUnlocked);
  const loadChats = useChatStore((s: ChatState) => s.loadChats);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userAlias, setUserAlias] = useState("");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick() {
      setContextMenu(null);
    }
    function handleContextMenu(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    }
    document.addEventListener("click", handleClick);
    document.addEventListener("contextmenu", handleContextMenu);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("cloak.identity.alias");
    if (stored) setUserAlias(stored);

    function handleStorage(e: StorageEvent) {
      if (e.key === "cloak.identity.alias") {
        setUserAlias(e.newValue || "");
      }
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setIsSettingsOpen(false);
    }
    document.addEventListener("click", handle);
    return () => document.removeEventListener("click", handle);
  }, []);

  const handleContextMenu = (e: React.MouseEvent, chat: ChatSummary) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, chatId: chat.id });
  };

  const handleClearChat = async (chatId: string) => {
    await clearChatMessages(chatId);
    setContextMenu(null);
  };

  const handleDeleteChat = async (chatId: string) => {
    await deleteChat(chatId);
    setContextMenu(null);
  };

  const handleMuteChat = async (chatId: string) => {
    await updateChat(chatId, { mutedForever: true });
    setContextMenu(null);
  };

  useEffect(() => {
    if (isUnlocked) void loadChats().catch(() => {});
  }, [isUnlocked, loadChats]);

  return (
    <aside className="flex h-screen w-80 flex-col border-r border-hairline bg-surface-container">
      {/* Logo / brand */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#dfe2ee"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <span className="text-base font-semibold text-on-surface">UQZERA</span>
      </div>

      {/* Divider after logo */}
      <div className="mx-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* Search bar */}
      <div className="px-4 pb-2">
        <div
          className="flex items-center gap-2 rounded-lg border px-3 py-1.5 transition-colors"
          style={{
            backgroundColor: "#181c24",
            borderColor: searchFocused ? "#10B981" : "rgba(255,255,255,0.08)",
          }}
        >
          <IconSearch
            size={16}
            style={{ color: searchFocused ? "#10B981" : "#bbcabf", flexShrink: 0 }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search chats, messages..."
            className="w-full bg-transparent text-sm outline-none"
            style={{ color: searchFocused ? "#10B981" : "#bbcabf" }}
          />
        </div>
      </div>

      {/* Chats nav */}
      <div
        className="flex items-center justify-between px-4 py-2 text-sm font-semibold cursor-pointer transition-colors"
        style={{ color: "var(--text-primary)" }}
      >
        <div className="flex items-center gap-2">
          <IconChat size={18} />
          <span>Chats</span>
        </div>
        <button
          onClick={() => setShowAddContact(true)}
          aria-label="Add contact"
          className="flex h-7 w-7 items-center justify-center rounded-lg transition"
          style={{ color: "#dfe2ee" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#181c24")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <IconPlus size={16} />
        </button>
      </div>

      {/* Scrollable chat list */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="flex items-center justify-center px-4 py-8 text-center text-xs text-on-surface-variant">
            No conversations found
          </div>
        ) : (
          sorted.map((chat) => {
            const preview =
              chat.kind === "notes"
                ? "Private Notes"
                : chat.alias;
            return (
              <div
                key={chat.id}
                onContextMenu={(e) => handleContextMenu(e, chat)}
                className="relative"
              >
                <button
                  onClick={() => setActiveChat(chat.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                    activeChatId === chat.id
                      ? "bg-[#059669]"
                      : "hover:bg-surface"
                  }`}
                >
                <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-high">
                  <span className="text-sm font-semibold text-on-surface">
                    {initials(chat.alias)}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-container bg-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-on-surface">
                      {chat.alias}
                    </span>
                    <span className="flex-shrink-0 text-[10px] text-on-surface-variant">
                      {formatTime(chat.updatedAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-xs text-on-surface-variant">
                      {preview}
                    </span>
                    {chat.unreadCount > 0 && (
                      <span className="flex-shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-on-primary">
                        {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
              {contextMenu && contextMenu.chatId === chat.id && (
                <div
                  ref={contextMenuRef}
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                  className="fixed z-50 w-48 rounded-xl border border-hairline bg-surface-container py-1 shadow-panel"
                >
                  <button
                    onClick={() => handleClearChat(chat.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-on-surface hover:bg-surface-high"
                  >
                    <IconX size={14} /> Clear Chat
                  </button>
                  <button
                    onClick={() => handleDeleteChat(chat.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-error hover:bg-surface-high"
                  >
                    <IconTrash size={14} /> Delete Chat
                  </button>
                  <button
                    onClick={() => handleMuteChat(chat.id)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-on-surface hover:bg-surface-high"
                  >
                    <IconBellOff size={14} /> Mute
                  </button>
                </div>
              )}
            </div>
          );
        })
        )}
      </div>

      {/* Divider above bottom section */}
      <div className="mx-4 border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }} />

      {/* Bottom fixed area */}
      <div className="flex flex-col border-t border-hairline">
        <button
          className="flex items-center gap-2 px-4 py-3 text-sm transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#181c24")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          <IconChannel size={18} />
          <span>Channels</span>
        </button>

        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={onOpenIdentity}
            aria-label="My Identity"
            className="flex items-center gap-3 text-left transition hover:bg-surface"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
              {initials(userAlias)}
            </div>
            <span className="text-sm font-medium text-on-surface">{userAlias || "Set alias"}</span>
          </button>
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setIsSettingsOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#181c24")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <IconSettings size={18} />
            </button>
            {isSettingsOpen && (
              <div className="absolute bottom-10 right-0 z-50 w-48 rounded-xl border border-hairline bg-surface-container py-1 shadow-panel">
                {["Linked Devices", "Account", "Appearance", "Notifications", "Privacy"].map((item) => (
                  <button
                    key={item}
                    onClick={() => setIsSettingsOpen(false)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-on-surface hover:bg-surface-high"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="px-4 pb-3">
          <p className="text-[10px] font-mono text-on-surface-variant">ID 0x4F2A_C91D</p>
        </div>
      </div>

      <AddContactModal
        open={showAddContact}
        onClose={() => setShowAddContact(false)}
      />

    </aside>
  );
}
