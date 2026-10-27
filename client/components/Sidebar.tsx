"use client";

import { useChatStore } from "../store/useChatStore";
import type { Channel } from "../types";
import Link from "next/link";

const NAV_ITEMS = [
  { label: "Chats", href: "/chats", icon: "chat" },
  { label: "Channels", href: "/chats/channels", icon: "tv" },
  { label: "Settings", href: "/chats/settings", icon: "settings" },
] as const;

export function Sidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const chats = useChatStore((s) => s.chats);
  const channels = useChatStore((s) => s.channels);
  const activeChatId = useChatStore((s) => s.activeChatId);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const addChannel = useChatStore((s) => s.addChannel);
  const removeDevice = useChatStore((s) => s.removeDevice);
  const devices = useChatStore((s) => s.devices);
  const panicShred = useChatStore((s) => s.panicShred);
  const setVaultModalOpen = useChatStore((s) => s.setVaultModalOpen);
  const showToast = useChatStore((s) => s.showToast);

  const unreadTotal = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  return (
    <div className="flex h-full w-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-crimson to-violet shadow-glow-sm">
          <span className="text-sm font-bold tracking-tight text-white">C</span>
        </div>
        <div>
          <h1 className="font-serif text-lg font-semibold tracking-tight text-zinc-100">
            Cloak
          </h1>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            Encrypted
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-2 py-2">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-300 transition hover:bg-zinc-900/60 hover:text-zinc-100"
          >
            <span className="material-symbols-outlined text-base text-zinc-400">
              {item.icon}
            </span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Channels */}
      <div className="mt-2 px-4">
        <div className="flex items-center justify-between">
          <h2 className="text-[10px] uppercase tracking-widest text-zinc-500">
            Channels
          </h2>
          <button
            onClick={() => {
              const name = prompt("Channel name");
              if (name) {
                addChannel({
                  id: crypto.randomUUID(),
                  name,
                  icon: "tag",
                  gradient: "from-crimson to-violet",
                  memberCount: 1,
                  category: "broadcast",
                  lastActivity: new Date().toISOString(),
                  lastSnippet: "Created",
                  verified: false,
                  idHash: "0x00",
                  broadcastOnly: true,
                  ephemeralHours: 24,
                  broadcasts: [],
                });
                showToast({
                  id: crypto.randomUUID(),
                  message: `Channel ${name} created`,
                  type: "success",
                });
              }
            }}
            className="text-xs text-crimson hover:text-crimson/80"
          >
            + New
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-1">
          {channels.length === 0 && (
            <p className="px-1 text-xs text-zinc-600">No channels yet.</p>
          )}
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-zinc-900/60"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-zinc-400">
                  {ch.icon}
                </span>
                <span className="text-xs text-zinc-300">{ch.name}</span>
              </div>
              <button
                onClick={() => {
                  removeDevice(ch.id);
                  showToast({
                    id: crypto.randomUUID(),
                    message: `Left ${ch.name}`,
                    type: "info",
                  });
                }}
                className="text-[10px] text-zinc-600 hover:text-crimson"
              >
                leave
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Devices */}
      <div className="mt-6 px-4">
        <h2 className="text-[10px] uppercase tracking-widest text-zinc-500">
          Devices
        </h2>
        <div className="mt-2 flex flex-col gap-1">
          {devices.length === 0 && (
            <p className="px-1 text-xs text-zinc-600">No sessions.</p>
          )}
          {devices.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-zinc-900/60"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    d.isCurrent
                      ? "bg-emerald shadow-glow-sm"
                      : "bg-zinc-600"
                  }`}
                />
                <div>
                  <p className="text-xs text-zinc-300">{d.name}</p>
                  <p className="text-[10px] text-zinc-500">{d.platform}</p>
                </div>
              </div>
              {!d.isCurrent && (
                <button
                  onClick={() => {
                    removeDevice(d.id);
                    showToast({
                      id: crypto.randomUUID(),
                      message: `Revoked ${d.name}`,
                      type: "warning",
                    });
                  }}
                  className="text-[10px] text-zinc-600 hover:text-crimson"
                >
                  revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Panic */}
      <div className="mt-auto px-4 py-4">
        <button
          onClick={() => setVaultModalOpen(true)}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
        >
          Lock Vault
        </button>
        <button
          onClick={() => setVaultModalOpen(true)}
          className="mt-2 w-full rounded-xl border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs font-medium text-crimson transition hover:bg-crimson/20"
        >
          Panic Shred
        </button>
      </div>
    </div>
  );
}
