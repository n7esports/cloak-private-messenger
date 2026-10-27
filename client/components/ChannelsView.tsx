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
      gradient: "from-crimson to-violet",
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
    <div className="flex h-full w-full overflow-y-auto bg-obsidian p-4">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-xl font-semibold text-zinc-100">
            Mesh Channels
          </h1>
          <button
            onClick={handleCreate}
            className="rounded-xl bg-crimson px-4 py-2 text-xs font-medium text-white transition hover:bg-crimson/90"
          >
            + New Channel
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {channels.length === 0 && (
            <div className="rounded-2xl border border-zinc-800/50 bg-zinc-900/60 p-6 text-center">
              <p className="text-sm text-zinc-400">
                No channels yet. Create or join a mesh channel to broadcast
                messages.
              </p>
            </div>
          )}
          {channels.map((ch) => (
            <div
              key={ch.id}
              className="rounded-2xl border border-zinc-800/50 bg-zinc-900/60 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-crimson to-violet shadow-glow-sm">
                    <span className="material-symbols-outlined text-white">
                      {ch.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {ch.name}
                    </h3>
                    <p className="text-xs text-zinc-500">
                      {ch.memberCount.toLocaleString()} members ·{" "}
                      {ch.category}
                    </p>
                  </div>
                </div>
                {ch.unread && (
                  <span className="h-2 w-2 rounded-full bg-emerald shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                )}
              </div>

              <p className="mt-3 text-xs text-zinc-400 line-clamp-2">
                {ch.lastSnippet}
              </p>

              {ch.broadcasts.length > 0 && (
                <div className="mt-3 flex flex-col gap-2">
                  {ch.broadcasts.map((b: Broadcast) => (
                    <div
                      key={b.id}
                      className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                          {b.senderNode}
                        </span>
                        <span className="text-[10px] text-zinc-600">
                          {b.timestamp}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-300 line-clamp-2">
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
