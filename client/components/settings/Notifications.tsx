"use client";

import { useState, useEffect, useCallback } from "react";
import { useChatStore } from "../../store/useChatStore";
import IconBellOff from "../icons/IconBellOff";

const PREVIEW_KEY = "cloak.settings.notifications.preview";
const RINGTONE_KEY = "cloak.settings.notifications.ringtone";

export default function NotificationSettings() {
  const [preview, setPreview] = useState(true);
  const [ringtone, setRingtone] = useState(true);
  const chats = useChatStore((s) => s.chats);

  useEffect(() => {
    const p = localStorage.getItem(PREVIEW_KEY);
    if (p !== null) setPreview(p === "true");
    const r = localStorage.getItem(RINGTONE_KEY);
    if (r !== null) setRingtone(r === "true");
  }, []);

  useEffect(() => {
    localStorage.setItem(PREVIEW_KEY, String(preview));
  }, [preview]);

  useEffect(() => {
    localStorage.setItem(RINGTONE_KEY, String(ringtone));
  }, [ringtone]);

  const mutedChats = chats.filter((c) => c.mutedForever || (c.mutedUntil && c.mutedUntil > Date.now()));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
        <h2 className="text-sm font-semibold text-on-surface">Message Preview</h2>
        <p className="mt-1 text-xs text-outline">Show message content in notifications.</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">{preview ? "On" : "Off"}</span>
          <Toggle checked={preview} onChange={setPreview} />
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
        <h2 className="text-sm font-semibold text-on-surface">Ringtone</h2>
        <p className="mt-1 text-xs text-outline">Play sound for incoming messages.</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-on-surface-variant">{ringtone ? "On" : "Off"}</span>
          <Toggle checked={ringtone} onChange={setRingtone} />
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
        <h2 className="text-sm font-semibold text-on-surface">Muted Chats</h2>
        <p className="mt-1 text-xs text-outline">Conversations with notifications silenced.</p>
        {mutedChats.length === 0 ? (
          <p className="mt-3 text-xs text-outline-variant">No muted chats.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {mutedChats.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container/40 px-3 py-2">
                <div>
                  <p className="text-sm text-on-surface">{c.alias}</p>
                  <p className="text-[10px] text-outline">
                    {c.mutedForever ? "Muted forever" : `Muted until ${c.mutedUntil ? new Date(c.mutedUntil).toLocaleString() : ""}`}
                  </p>
                </div>
                <IconBellOff size={14} className="text-outline-variant" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`h-6 w-10 rounded-full border border-hairline transition-colors ${
        checked ? "bg-primary" : "bg-surface-low"
      }`}
    >
      <span
        className={`block h-4 w-4 rounded-full bg-current transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
