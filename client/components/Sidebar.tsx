"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { useVaultStore } from "../store/useVaultStore";
import { encodeBytes } from "../lib/protocol";
import {
  IconBroadcast,
  IconChat,
  IconChevronRight,
  IconClose,
  IconLock,
  IconMore,
  IconSearch,
  IconShield,
  IconUsers,
} from "./icons/UiIcons";

const PROFILE_PUBKEY_PREFIX = "0x98f4";
const PROFILE_PUBKEY_SUFFIX = "3a1c";
const PROFILE_ALIAS = "Cipher Zero";

function shortenKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export function Sidebar() {
  const pathname = usePathname();
  const chats = useChatStore((state) => state.chats);
  const isRelayConnected = useChatStore((state) => state.isRelayConnected);
  const relayStatus = useChatStore((state) => state.relayStatus);
  const identity = useVaultStore((state) => state.identity);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(true);

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);
  const directChats = chats.filter((chat) => chat.kind === "direct");
  const notesChat = chats.find((chat) => chat.kind === "notes");

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      document.documentElement.dataset.theme = next ? "dark" : "light";
      try { window.localStorage.setItem("cloak-theme", next ? "dark" : "light"); } catch { /* ignore */ }
      return next;
    });
  };

  // Sync dark mode state from external changes (ThemeProvider, lock page)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isLight = document.documentElement.dataset.theme === "light";
      setIsDarkMode(!isLight);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    setIsDarkMode(document.documentElement.dataset.theme !== "light");
    return () => observer.disconnect();
  }, []);

  const isChatsActive = pathname === "/chats" || (pathname?.startsWith("/chats/") ?? false);
  const isChannelsActive = pathname === "/chats/channels";

  return (
    <>
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-80 max-w-[85vw] flex-col border-r border-cloak-border/30 bg-zinc-950/95 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col gap-3 p-4">
          {/* Logo & Top Utilities */}
          <div className="flex items-center justify-between">
            <Link
              href="/chats"
              className="group flex items-center gap-2 text-left focus:outline-none"
            >
              <span className="grid h-9 w-9 place-items-center rounded-xl border border-cloak-accent/30 bg-cloak-accent/10 text-cloak-accent">
                <IconShield className="h-5 w-5" />
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold tracking-tight text-zinc-100">
                  Cloak
                </span>
                <IconLock className="h-4 w-4 text-cloak-accent" />
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                aria-label="Toggle Theme"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
              >
                {isDarkMode ? (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z" />
                  </svg>
                )}
              </button>
              <Link
                href="/chats/channels"
                aria-label="Settings"
                title="Settings & Node Configuration"
                className={`grid h-9 w-9 place-items-center rounded-lg transition-colors ${
                  isChannelsActive
                    ? "bg-white/10 text-cloak-accent"
                    : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
                }`}
              >
                <IconUsers className="h-5 w-5" />
              </Link>
              {/* Mobile Close */}
              <button
                onClick={() => setSidebarOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg text-zinc-400 hover:bg-white/5 hover:text-zinc-100 lg:hidden"
                aria-label="Close sidebar"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Search Field */}
          <div className="relative flex items-center">
            <IconSearch className="pointer-events-none absolute left-3 h-4 w-4 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-white/5 py-2 pl-9 pr-3 text-sm text-zinc-100 outline-none transition-all placeholder:text-zinc-500 focus:border-cloak-accent/40 focus:bg-white/[0.07]"
              placeholder="Search conversations..."
              type="text"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 text-zinc-500 hover:text-zinc-200"
                aria-label="Clear search"
              >
                <IconClose className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Device Vault Card */}
          <div className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/[0.04] px-3 py-2">
            <div className="flex items-center gap-2">
              <IconShield className="h-4 w-4 text-cloak-accent" />
              <span className="font-mono text-xs text-zinc-200">
                Device Vault: {directChats.length} device{directChats.length === 1 ? "" : "s"}
              </span>
            </div>
            <span className="font-mono text-xs font-semibold uppercase tracking-wider text-cloak-accent">
              Active
            </span>
          </div>

          {/* Relay Status Card */}
          <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                {isRelayConnected && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cloak-accent opacity-75" />
                )}
                <span
                  className={`relative inline-flex h-2 w-2 rounded-full ${
                    isRelayConnected ? "bg-cloak-accent" : "bg-zinc-500"
                  }`}
                />
              </span>
              <span className="font-mono text-xs font-medium text-zinc-400">
                {isRelayConnected ? "Relay Connected" : relayStatus === "connecting" ? "Relay Connecting…" : "Relay Offline"}
              </span>
            </div>
            <span className="font-mono text-xs text-emerald-400">
              {isRelayConnected ? "23ms" : "—"}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
          <Link
            href="/chats"
            className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 transition-all ${
              isChatsActive
                ? "bg-white/10 font-semibold text-cloak-accent shadow-sm"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <IconChat className="h-5 w-5" />
              <span className="text-sm font-medium">Chats</span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${
                isChatsActive
                  ? "bg-cloak-accent/20 text-cloak-accent"
                  : "bg-white/5 text-zinc-400"
              }`}
            >
              {totalUnread}
            </span>
          </Link>

          <Link
            href="/chats/channels"
            className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 transition-all ${
              isChannelsActive
                ? "bg-white/10 font-semibold text-cloak-accent shadow-sm"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <IconBroadcast className="h-5 w-5" />
              <span className="text-sm font-medium">Channels</span>
            </div>
            <span className="rounded-full bg-white/5 font-mono text-xs text-emerald-400">
              {channels.length}
            </span>
          </Link>

          <Link
            href="/chats"
            className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-zinc-400 transition-all hover:bg-white/5 hover:text-zinc-100"
          >
            <div className="flex items-center gap-3">
              <IconUsers className="h-5 w-5" />
              <span className="text-sm font-medium">Contacts</span>
            </div>
          </Link>
        </nav>

        {/* Bottom Section */}
        <div className="relative flex flex-col gap-3 border-t border-white/5 p-4">
          <Link
            href="/chats/channels"
            className="group flex w-full items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3 text-zinc-100 shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition-all hover:bg-white/10"
          >
            <div className="flex items-center gap-3">
              <IconBroadcast className="h-5 w-5 text-cloak-accent" />
              <span className="text-sm font-medium">Browse Channels</span>
            </div>
            <IconChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:translate-x-0.5" />
          </Link>

          {/* User Profile */}
          <div className="relative flex items-center justify-between pt-1">
            <div className="group flex min-w-0 cursor-pointer items-center gap-3">
              <div className="relative flex-shrink-0">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/5 text-sm font-semibold text-emerald-200 ring-1 ring-cloak-accent/40 transition-all group-hover:ring-cloak-accent">
                  {PROFILE_ALIAS.slice(0, 1)}
                </span>
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-cloak-accent ring-2 ring-zinc-950" />
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-medium text-zinc-100 transition-colors group-hover:text-cloak-accent">
                  {PROFILE_ALIAS}
                </span>
                <span className="truncate font-mono text-xs text-cloak-accent">
                  {identity
                    ? shortenKey(encodeBytes(identity.encryptionPublicKey))
                    : `${PROFILE_PUBKEY_PREFIX}…${PROFILE_PUBKEY_SUFFIX}`}
                </span>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                aria-label="Profile actions"
                className="grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
              >
                <IconMore className="h-4 w-4" />
              </button>

              {/* Profile popup dropdown */}
              {profileMenuOpen && (
                <div className="absolute bottom-12 right-0 z-50 flex w-52 flex-col gap-0.5 rounded-2xl border border-white/10 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95">
                  <button
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5"
                  >
                    <IconLock className="h-4 w-4 text-cloak-accent" />
                    <span>My Public Key & QR</span>
                  </button>
                  <button
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5"
                  >
                    <IconShield className="h-4 w-4 text-emerald-400" />
                    <span>Safety Numbers</span>
                  </button>
                  <button
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5"
                  >
                    <IconUsers className="h-4 w-4 text-amber-400" />
                    <span>Relay & Onion Nodes</span>
                  </button>
                  <div className="my-1 h-px bg-white/5" />
                  <button
                    onClick={() => setProfileMenuOpen(false)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/5"
                  >
                    <IconLock className="h-4 w-4 text-cloak-accent" />
                    <span>Rotate Ephemeral Key</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
