"use client";

import { useChatStore } from "../store/useChatStore";
import type { RelayStatus } from "../lib/transport";

const STATUS_META: Record<
 RelayStatus,
 { label: string; color: string }
> = {
 connected: { label: "Secure", color: "bg-primary " },
 connecting: { label: "Connecting", color: "bg-amber " },
 disconnected: { label: "Offline", color: "bg-surface-container" },
 error: { label: "Error", color: "bg-error " },
};

export function Header({
 onMenuClick,
}: {
 onMenuClick?: () => void;
}) {
 const relayStatus = useChatStore((s) => s.relayStatus);
 const isRelayConnected = useChatStore((s) => s.isRelayConnected);

 const meta = STATUS_META[relayStatus] || STATUS_META.disconnected;

 return (
 <header className="flex items-center justify-between border-b border-outline-variant/60 bg-surface/40 px-4 py-3 backdrop-blur-md">
 <div className="flex items-center gap-3">
 {onMenuClick && (
 <button
 onClick={onMenuClick}
 className="md:hidden rounded-lg border border-outline-variant px-2 py-1 text-xs text-on-surface-variant"
 >
 Menu
 </button>
 )}
 <div className="flex items-center gap-2">
 <span
 className={`h-2 w-2 rounded-full ${meta.color}`}
 />
 <span className="text-xs uppercase tracking-widest text-on-surface-variant">
 {meta.label}
 </span>
 </div>
 </div>
 </header>
 );
}
