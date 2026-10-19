"use client";

import React, { useState, useMemo } from "react";

import { useChatStore } from "../store/useChatStore";
import {
  IconCheckDouble,
  IconClose,
  IconCopy,
  IconLock,
  IconMessagePlus,
  IconPaperclip,
  IconSearch,
  IconShield,
  IconTimer,
  IconWifi,
  IconWifiOff,
} from "./icons/UiIcons";

const AVATAR_TINTS = [
  "from-emerald-500/30 to-emerald-500/5 text-emerald-700 dark:text-emerald-200",
  "from-sky-500/30 to-sky-500/5 text-sky-700 dark:text-sky-200",
  "from-violet-500/30 to-violet-500/5 text-violet-700 dark:text-violet-200",
  "from-amber-500/30 to-amber-500/5 text-amber-700 dark:text-amber-200",
  "from-rose-500/30 to-rose-500/5 text-rose-700 dark:text-rose-200",
];

function avatarTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

function initials(alias: string): string {
  const trimmed = alias.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function MessagesView() {
  const chats = useChatStore((s) => s.chats);
  const messagesMap = useChatStore((s) => s.messagesMap);
  const relayStatus = useChatStore((s) => s.relayStatus);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const showToast = useChatStore((s) => s.showToast);

  const [activeTab, setActiveTab] = useState<"all" | "unread" | "groups">("all");
  const [localSearch, setLocalSearch] = useState("");
  const [showWidgets, setShowWidgets] = useState(false);

  const filteredChats = useMemo(() => {
    const query = localSearch.toLowerCase().trim();
    return chats.filter((c) => {
      if (activeTab === "unread" && c.unreadCount === 0) return false;
      if (activeTab === "groups" && c.kind !== "system") return false;
      if (query) {
        return (
          c.alias.toLowerCase().includes(query) ||
          c.recipientPubKey.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [chats, activeTab, localSearch]);

  const unreadCountTotal = useMemo(
    () => chats.filter((c) => c.unreadCount > 0).length,
    [chats],
  );
  const meshChannelsCount = useMemo(
    () => chats.filter((c) => c.kind === "system").length,
    [chats],
  );

  const copyPublicKey = () => {
    const key = "0x89ab2c7f991e4a10bc33d8204918ef0012cc4c21";
    navigator.clipboard?.writeText(key);
    showToast({
      id: crypto.randomUUID(),
      message: "Public key 0x89ab...4c21 copied to clipboard",
    });
  };

  const relayConnected = relayStatus === "connected";

  return (
    <div className="cloak-ambient cloak-app-screen flex flex-col font-sans text-cloak-text">
      <div className="relative w-full overflow-hidden p-3 sm:p-5 md:p-6 flex flex-col gap-space-lg">
        {/* Ambient backdrops */}
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-cloak-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 rounded-full bg-cloak-accent/5 blur-3xl pointer-events-none" />

        {/* Section Header */}
        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-space-xs flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cloak-surface-2 text-cloak-accent font-mono text-[10px] uppercase tracking-wider border border-cloak-border">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cloak-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cloak-accent" />
                </span>
                Ephemeral Ratchet Active
              </span>
              <span className="font-label-code-sm text-label-code-sm text-cloak-muted font-mono">
                NODE #104.ZURICH
              </span>
            </div>
            <h1 className="font-headline-xl text-headline-xl text-cloak-text tracking-tight font-bold flex items-center gap-space-sm">
              Messages
              <span className="text-cloak-dim/40 font-label-code-lg text-label-code-lg font-normal">
                / 0{chats.length}
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-space-sm self-start md:self-auto flex-wrap">
            <div className="relative flex items-center">
              <IconSearch className="absolute left-3 text-cloak-muted text-[18px] pointer-events-none" />
              <input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="bg-cloak-surface-1 text-cloak-text placeholder:text-cloak-dim/50 font-body-sm text-body-sm pl-9 pr-3 py-2 rounded-xl outline-none focus:bg-cloak-surface-2 border border-cloak-border transition-all w-full sm:w-60"
                placeholder="Filter cryptonyms..."
                type="text"
              />
              {localSearch && (
                <button
                  onClick={() => setLocalSearch("")}
                  className="absolute right-2.5 text-cloak-muted hover:text-cloak-text"
                >
                  <IconClose className="text-[16px]" />
                </button>
              )}
            </div>

            <button
              onClick={() => {
                setActiveChat(null);
                window.location.href = "/chats?compose=1";
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cloak-accent text-cloak-base text-sm font-semibold hover:bg-cloak-accent-hover transition-all shadow-[0_0_20px_rgba(78,222,163,0.25)] active:scale-95 cursor-pointer"
              type="button"
            >
              <IconMessagePlus className="text-[18px]" />
              <span className="hidden sm:inline">New Session</span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 z-10">
          {/* Left Column: Filter Tabs & Conversation List */}
          <div className="lg:col-span-8 flex flex-col gap-space-md">
            {/* Filter Tabs Bar */}
            <div className="flex items-center justify-between p-1 rounded-xl bg-cloak-surface-1/90 backdrop-blur-xl border border-cloak-border">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
                {(
                  [
                    { key: "all", label: "All Encrypted", count: chats.length },
                    { key: "unread", label: "Unread", count: unreadCountTotal },
                    { key: "groups", label: "Mesh Channels", count: meshChannelsCount },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm flex items-center gap-2 transition-all cursor-pointer ${
                      activeTab === tab.key
                        ? "bg-cloak-surface-2 text-cloak-accent font-semibold shadow-sm"
                        : "text-cloak-muted hover:text-cloak-text hover:bg-cloak-surface-1"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-cloak-accent/20 text-cloak-accent font-label-code-sm text-label-code-sm">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 px-3 text-cloak-muted text-xs">
                {relayConnected ? (
                  <IconWifi className="text-[14px] text-cloak-accent" />
                ) : (
                  <IconWifiOff className="text-[14px] text-cloak-muted" />
                )}
                <span>Zero-Knowledge Relay</span>
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex flex-col gap-2">
              {filteredChats.length === 0 ? (
                <div className="p-8 rounded-2xl bg-cloak-surface-1/50 border border-cloak-border/30 text-center flex flex-col items-center justify-center gap-2">
                  <IconSearch className="text-cloak-dim text-[32px]" />
                  <span className="text-sm text-cloak-text">
                    No matching cryptographic sessions found
                  </span>
                  <p className="text-sm text-cloak-muted">
                    Try adjusting your cryptonym query or filter tab.
                  </p>
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isUnread = chat.unreadCount > 0;
                  const isGroup = chat.kind === "system";
                  const lastMsg = (messagesMap[chat.id] ?? []).slice(-1)[0];
                  const preview = lastMsg?.content || "No messages yet";
                  const timestamp = lastMsg
                    ? formatTime(lastMsg.timestamp)
                    : formatTime(chat.updatedAt);

                  return (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setActiveChat(chat.id);
                        if (chat.kind === "notes") {
                          window.location.href = "/chats/notes";
                        } else {
                          window.location.href = `/chats/chat/${chat.id}`;
                        }
                      }}
                      className={`group relative flex items-center gap-4 p-4 rounded-2xl bg-cloak-surface-1/80 hover:bg-cloak-surface-2/80 border border-cloak-border/50 shadow-md cursor-pointer transition-all ${
                        isUnread
                          ? "bg-cloak-surface-1 hover:bg-cloak-surface-2"
                          : "bg-cloak-surface-1/60 hover:bg-cloak-surface-2/80"
                      }`}
                    >
                      {isUnread && (
                        <div
                          className={`absolute left-0 top-3 bottom-3 w-1 rounded-r-full ${
                            isGroup ? "bg-cloak-accent" : "bg-cloak-accent"
                          }`}
                        />
                      )}

                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarTint(
                            chat.id,
                          )} flex items-center justify-center font-headline-md text-headline-md font-bold shadow-inner`}
                        >
                          {initials(chat.alias)}
                        </div>
                        <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-cloak-surface-0 flex items-center justify-center">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isGroup ? "bg-cloak-accent" : "bg-cloak-accent"
                            }`}
                          />
                        </span>
                      </div>

                      {/* Content Preview */}
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center justify-between gap-space-sm">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-semibold text-base text-cloak-text truncate">
                              {chat.alias}
                            </span>
                            <IconLock className="text-cloak-accent text-[15px] flex-shrink-0" />
                            {chat.kind === "notes" && (
                              <span className="px-1.5 py-0.2 rounded bg-cloak-surface-3 text-cloak-muted font-label-code-sm text-label-code-sm">
                                NOTES
                              </span>
                            )}
                          </div>
                          <span
                            className={`font-label-code-sm text-label-code-sm font-mono flex-shrink-0 ${
                              isUnread ? "text-cloak-accent" : "text-cloak-muted"
                            }`}
                          >
                            {timestamp}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-space-sm">
                          <p className="text-sm text-cloak-muted truncate flex items-center gap-1">
                            {lastMsg?.attachment && (
                              <IconPaperclip className="text-[14px] text-cloak-muted" />
                            )}
                            <span>{preview}</span>
                          </p>

                          {isUnread ? (
                            <span
                              className={`flex-shrink-0 px-2 py-0.5 rounded-full font-label-code-sm text-label-code-sm font-bold ${
                                isGroup
                                  ? "bg-cloak-accent text-cloak-base"
                                  : "bg-cloak-accent text-cloak-base"
                              }`}
                            >
                              {chat.unreadCount}
                            </span>
                          ) : (
                            <IconCheckDouble className="text-cloak-accent text-[16px] flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Widgets */}
          <div className={`lg:col-span-4 flex flex-col gap-space-md ${showWidgets ? "block" : "hidden lg:block"}`}>
            {/* Mobile Widget Toggle */}
            <button
              onClick={() => setShowWidgets((v) => !v)}
              className="lg:hidden flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-cloak-surface-1/90 border border-cloak-border text-cloak-muted font-headline-sm text-headline-sm cursor-pointer"
              type="button"
            >
              <IconShield className="text-[16px]" />
              {showWidgets ? "Hide Widgets" : "Show Widgets"}
            </button>
            {/* Widget 1: Cryptographic Health */}
            <div className="p-4 rounded-2xl bg-cloak-surface-1/70 backdrop-blur-xl flex flex-col gap-4 shadow-sm border border-cloak-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-cloak-text flex items-center gap-2">
                  <IconShield className="text-cloak-accent text-[20px]" />
                  Cryptographic Health
                </span>
                <span className="text-xs text-cloak-accent uppercase font-mono tracking-wider">
                  Optimal
                </span>
              </div>

              <div className="flex items-center justify-between p-space-sm rounded-xl bg-cloak-surface-0 border border-cloak-border/30">
                <div className="flex flex-col">
                  <span className="text-xs text-cloak-muted">
                    Active Double Ratchets
                  </span>
                  <span className="text-base font-bold text-cloak-text">
                    {chats.filter((c) => c.kind === "direct").length} Sessions
                  </span>
                </div>
                <div className="w-12 h-12 flex items-center justify-center">
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-cloak-surface-3"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                    />
                    <path
                      className="text-cloak-accent"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="currentColor"
                      strokeDasharray="100, 100"
                      strokeLinecap="round"
                      strokeWidth="3.5"
                    />
                  </svg>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cloak-muted">Onion Routing Hops</span>
                  <span className="text-cloak-accent font-mono">3 / 3 Verified</span>
                </div>
                <div className="w-full bg-cloak-surface-0 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-cloak-accent h-full rounded-full w-full" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-cloak-border/40">
                <span className="text-xs text-cloak-muted">
                  Public Key Identity:
                </span>
                <button
                  onClick={copyPublicKey}
                  className="font-label-code-sm text-label-code-sm text-cloak-accent font-mono hover:underline flex items-center gap-1 cursor-pointer"
                  title="Copy 256-bit identity"
                >
                  0x89ab...4c21
                  <IconCopy className="text-[14px]" />
                </button>
              </div>
            </div>

            {/* Widget 2: Auto-Burn Protocol */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-cloak-surface-1/90 to-cloak-surface-2/90 p-4 flex flex-col gap-2 backdrop-blur-xl shadow-sm border border-cloak-border">
              <div className="flex items-center gap-space-sm">
                <div className="p-2 rounded-xl bg-cloak-accent/10 text-cloak-accent border border-cloak-accent/20">
                  <IconTimer className="text-[22px]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-cloak-text">
                    Auto-Burn Protocol
                  </span>
                  <span className="text-xs text-cloak-muted">
                    Global Ephemeral Mode
                  </span>
                </div>
              </div>
              <p className="text-sm text-cloak-muted leading-relaxed">
                Messages automatically shred cryptographically from physical
                memory after 24 hours across peer consensus.
              </p>
              <div className="flex items-center justify-between mt-2 pt-space-xs border-t border-cloak-border/40">
                <span className="text-xs text-cloak-accent font-mono">
                  DEFAULT TTL: 86,400s
                </span>
                <button
                  onClick={() =>
                    showToast({
                      id: crypto.randomUUID(),
                      message: "TTL configuration opened",
                    })
                  }
                  className="px-3 py-1 rounded-lg bg-cloak-surface-3 text-cloak-text text-sm hover:bg-cloak-surface-2 transition-colors cursor-pointer"
                >
                  Configure
                </button>
              </div>
            </div>

            {/* Widget 3: Relay Swarm Status */}
            <div className="p-4 rounded-2xl bg-cloak-surface-0/80 backdrop-blur-xl flex flex-col gap-2 shadow-sm border border-cloak-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-cloak-text flex items-center gap-2">
                  <IconWifi className="text-cloak-accent text-[20px]" />
                  Relay Swarm Status
                </span>
                <span className="text-xs text-cloak-accent font-mono">
                  {relayConnected ? "P2P ACTIVE" : "OFFLINE"}
                </span>
              </div>
              {[
                { name: "Zurich Exit-01", latency: "18ms", active: true },
                { name: "Reykjavik Guard-04", latency: "31ms", active: true },
                { name: "Singapore Mix-09", latency: "82ms", active: false },
              ].map((node) => (
                <div
                  key={node.name}
                  className="flex items-center justify-between py-1 border-b border-cloak-border/20 last:border-0"
                >
                  <span className="text-sm text-cloak-muted flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        node.active ? "bg-cloak-accent" : "bg-cloak-muted"
                      }`}
                    />
                    {node.name}
                  </span>
                  <span
                    className={`text-xs font-mono ${
                      node.active ? "text-cloak-accent" : "text-cloak-muted"
                    }`}
                  >
                    {node.latency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
