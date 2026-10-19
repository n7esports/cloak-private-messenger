"use client";

import { useChatStore } from "../store/useChatStore";
import { useVaultStore } from "../store/useVaultStore";
import { EPHEMERAL_TIMERS } from "../lib/protocol";
import {
  IconShieldCheck,
  IconTimer,
} from "./icons/UiIcons";

const PROFILE_ALIAS = "Cipher Zero";

function shortenKey(key: string): string {
  if (key.length <= 12) return key;
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

const TIMER_LABELS = new Map<number, string>([
  [5_000, "5s"],
  [60_000, "1m"],
  [3_600_000, "1h"],
  [86_400_000, "1d"],
  [604_800_000, "7d"],
]);

export function Header() {
  const activeChatId = useChatStore((state) => state.activeChatId);
  const chats = useChatStore((state) => state.chats);
  const sidebarOpen = useChatStore((state) => state.sidebarOpen);
  const setSidebarOpen = useChatStore((state) => state.setSidebarOpen);
  const isRelayConnected = useChatStore((state) => state.isRelayConnected);
  const identity = useVaultStore((state) => state.identity);

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const ephemeralTtl = activeChat?.disappearingMs
    ? TIMER_LABELS.get(activeChat.disappearingMs) ?? "Custom"
    : "Off";

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between border-b border-white/5 bg-zinc-950/85 px-4 shadow-[0_1px_8px_rgba(0,0,0,0.2)] backdrop-blur-xl lg:left-80 lg:px-8">
      <div className="flex items-center gap-3">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="grid h-10 w-10 place-items-center rounded-xl text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100 lg:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={sidebarOpen}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 shadow-sm">
          <IconShieldCheck className="h-3.5 w-3.5 text-cloak-accent" />
          <span className="font-mono text-xs font-medium tracking-wider text-zinc-200">
            E2EE: DOUBLE RATCHET
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          className="flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
          title="Configure ephemeral shredding"
        >
          <IconTimer className="h-4 w-4 text-cloak-accent" />
          <span className="font-mono text-xs uppercase">
            EPHEMERAL: {ephemeralTtl}
          </span>
        </button>

        <button
          aria-label="Security Status"
          title="Cryptographic Health & Safety Numbers"
          className="grid h-10 w-10 cursor-pointer place-items-center rounded-xl text-zinc-400 transition-colors hover:bg-white/5 hover:text-cloak-accent"
        >
          <IconShieldCheck className="h-5 w-5" />
        </button>

        <button
          className="relative cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-cloak-accent/50"
          title={`${PROFILE_ALIAS} Profile & Keys`}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-emerald-500/30 to-emerald-500/5 text-xs font-semibold text-emerald-200 ring-1 ring-cloak-accent/40 transition-all hover:ring-cloak-accent">
            {PROFILE_ALIAS.slice(0, 1)}
          </span>
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-cloak-accent ring-2 ring-zinc-950" />
        </button>

      </div>
    </header>
  );
}
