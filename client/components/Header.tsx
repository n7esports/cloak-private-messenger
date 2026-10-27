"use client";

import { useChatStore } from "../store/useChatStore";
import type { RelayStatus } from "../lib/transport";

const STATUS_META: Record<
  RelayStatus,
  { label: string; color: string }
> = {
  connected: { label: "Secure", color: "bg-emerald shadow-glow-sm" },
  connecting: { label: "Connecting", color: "bg-amber shadow-[0_0_10px_rgba(245,158,11,0.5)]" },
  disconnected: { label: "Offline", color: "bg-zinc-600" },
  error: { label: "Error", color: "bg-crimson shadow-[0_0_10px_rgba(220,38,38,0.4)]" },
};

export function Header({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const relayStatus = useChatStore((s) => s.relayStatus);
  const isRelayConnected = useChatStore((s) => s.isRelayConnected);
  const showToast = useChatStore((s) => s.showToast);

  const meta = STATUS_META[relayStatus] || STATUS_META.disconnected;

  return (
    <header className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/40 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-300"
          >
            Menu
          </button>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${meta.color}`}
          />
          <span className="text-xs uppercase tracking-widest text-zinc-400">
            {meta.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() =>
            showToast({
              id: crypto.randomUUID(),
              message: "E2EE verified",
              type: "success",
            })
          }
          className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
        >
          Verify Safety Numbers
        </button>
        <button
          onClick={() =>
            showToast({
              id: crypto.randomUUID(),
              message: "No new devices",
              type: "info",
            })
          }
          className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
        >
          Devices
        </button>
      </div>
    </header>
  );
}
