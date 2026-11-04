"use client";

import { type CallRecord } from "../app/calls/page";
import IconPhone from "./icons/IconPhone";
import IconVideo from "./icons/IconVideo";
import IconX from "./icons/IconX";

function formatCallTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface CallListProps {
  calls: CallRecord[];
  onCall: (call: CallRecord) => void;
}

export default function CallList({ calls, onCall }: CallListProps) {
  return (
    <div className="flex h-full w-full flex-col bg-surface">
      <header className="border-b border-border-default bg-surface px-4 py-3">
        <h1 className="text-sm font-semibold text-on-surface">Calls</h1>
      </header>
      <div className="flex-1 overflow-y-auto">
        {calls.length === 0 && (
          <p className="py-8 text-center text-sm text-outline">No call history.</p>
        )}
        <div className="flex flex-col">
          {calls.map((call) => (
            <div
              key={call.id}
              role="button"
              tabIndex={0}
              onClick={() => onCall(call)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-high"
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-surface-container">
                <span className="text-sm font-semibold text-on-surface">
                  {call.name.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-on-surface">{call.name}</span>
                  <span className="flex-shrink-0 text-[10px] text-on-surface-variant">{formatCallTime(call.timestamp)}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {call.type === "incoming" && <IconPhone size={12} className="text-text-secondary" />}
                  {call.type === "outgoing" && <IconPhone size={12} className="text-text-secondary rotate-[135deg]" />}
                  {call.type === "missed" && <IconX size={12} className="text-status-danger" />}
                  <span className={`text-xs ${call.missed ? "text-status-danger" : "text-text-secondary"}`}>
                    {call.missed ? "Missed" : call.type === "incoming" ? "Incoming" : "Outgoing"}
                    {call.durationSeconds ? ` · ${formatDuration(call.durationSeconds)}` : ""}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onCall(call); }}
                className="rounded-full border border-hairline bg-surface-container p-2 text-text-secondary transition hover:text-primary hover:border-primary"
                title="Call back"
              >
                <IconPhone size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
