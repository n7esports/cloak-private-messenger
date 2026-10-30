"use client";

import { useChatStore } from "../store/useChatStore";
import type { Channel, Broadcast } from "../types";

export function ChannelsView() {
 const channels = useChatStore((s) => s.channels);
 const addChannel = useChatStore((s) => s.addChannel);
 const showToast = useChatStore((s) => s.showToast);

 const handleCreate = () => {
 const name = prompt("Channel name (e.g. #ops)");
 if (!name) return;
 const ch: Channel = {
 id: crypto.randomUUID(),
 name,
 icon: "tag",
 memberCount: 1,
 category: "private",
 lastActivity: new Date().toISOString(),
 lastSnippet: "Channel created",
 verified: false,
 idHash: "0x00",
 broadcastOnly: false,
 ephemeralHours: 24,
 broadcasts: [],
 };
 addChannel(ch);
 showToast({
 id: crypto.randomUUID(),
 message: `Joined ${name}`,
 type: "success",
 });
 };

 return (
 <div className="flex h-full w-full overflow-y-auto bg-surface p-4">
 <div className="mx-auto w-full max-w-2xl">
 <div className="flex items-center justify-between">
 <h1 className="font-sans text-xl font-semibold text-on-surface">
 Mesh Channels
 </h1>
 <button
 onClick={handleCreate}
 className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-on-primary transition hover:bg-primary/90"
 >
 + New Channel
 </button>
 </div>

 <div className="mt-4 flex flex-col gap-3">
 {channels.length === 0 && (
 <div className="rounded-2xl border border-outline-variant/50 bg-surface-container p-6 text-center">
 <p className="text-sm text-on-surface-variant">
 No channels yet. Create or join a mesh channel to broadcast
 messages.
 </p>
 </div>
 )}
 {channels.map((ch) => (
 <div
 key={ch.id}
 className="rounded-2xl border border-outline-variant/50 bg-surface-container p-4"
 >
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-high">
 <span className="text-sm text-on-surface">
 {ch.icon}
 </span>
 </div>
 <div>
 <h3 className="text-sm font-semibold text-on-surface">
 {ch.name}
 </h3>
 <p className="text-xs text-outline">
 {ch.memberCount.toLocaleString()} members ·{" "}
 {ch.category}
 </p>
 </div>
 </div>
 {ch.unread && (
 <span className="h-2 w-2 rounded-full bg-primary" />
 )}
 </div>

 <p className="mt-3 text-xs text-on-surface-variant line-clamp-2">
 {ch.lastSnippet}
 </p>

 {ch.broadcasts.length > 0 && (
 <div className="mt-3 flex flex-col gap-2">
 {ch.broadcasts.map((b: Broadcast) => (
 <div
 key={b.id}
 className="rounded-xl border border-outline-variant/60 bg-surface-container/60 p-3"
 >
 <div className="flex items-center justify-between">
 <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">
 {b.senderNode}
 </span>
 <span className="text-[10px] text-outline-variant">
 {b.timestamp}
 </span>
 </div>
 <p className="mt-1 text-xs text-on-surface line-clamp-2">
 {b.content}
 </p>
 </div>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 </div>
 );
}
