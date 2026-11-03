"use client";

import { useChatStore } from "../../store/useChatStore";

export default function ChatsSettings() {
  const chats = useChatStore((s) => s.chats);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
        <h2 className="text-sm font-semibold text-on-surface">Chats</h2>
        <p className="mt-1 text-xs text-outline">Manage your conversations.</p>
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Total chats</span>
            <span className="text-xs text-on-surface">{chats.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Pinned</span>
            <span className="text-xs text-on-surface">{chats.filter((c) => c.pinned).length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Muted</span>
            <span className="text-xs text-on-surface">{chats.filter((c) => c.mutedForever || (c.mutedUntil && c.mutedUntil > Date.now())).length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant">Archived</span>
            <span className="text-xs text-on-surface">{chats.filter((c) => c.archived).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
