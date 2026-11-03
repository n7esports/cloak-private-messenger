"use client";

import { useChatStore } from "../../store/useChatStore";

export default function BlockedUsers() {
  const chats = useChatStore((s) => s.chats);
  const blocked = chats.filter((c) => c.blocked);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
        <h2 className="text-sm font-semibold text-on-surface">Blocked Users</h2>
        <p className="mt-1 text-xs text-outline">Contacts you have blocked.</p>
        {blocked.length === 0 ? (
          <p className="mt-3 text-xs text-outline-variant">No blocked users.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {blocked.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-hairline bg-surface px-4 py-3">
                <span className="text-sm text-on-surface">{c.alias}</span>
                <button className="text-xs text-text-secondary hover:text-text-primary">Unblock</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
