"use client";

import { useChatStore } from "../store/useChatStore";

const TTL_OPTIONS = [
  { label: "Off", value: null },
  { label: "1 hour", value: 1000 * 60 * 60 },
  { label: "6 hours", value: 1000 * 60 * 60 * 6 },
  { label: "24 hours", value: 1000 * 60 * 60 * 24 },
  { label: "7 days", value: 1000 * 60 * 60 * 24 * 7 },
];

export function SettingsView() {
  const devices = useChatStore((s) => s.devices);
  const ephemeralTtl = useChatStore((s) => s.ephemeralTtl);
  const setEphemeralTtl = useChatStore((s) => s.setEphemeralTtl);
  const removeDevice = useChatStore((s) => s.removeDevice);
  const panicShred = useChatStore((s) => s.panicShred);
  const showToast = useChatStore((s) => s.showToast);

  return (
    <div className="flex h-full w-full overflow-y-auto bg-obsidian p-4">
      <div className="mx-auto w-full max-w-2xl">
        <h1 className="font-serif text-xl font-semibold text-zinc-100">
          Settings
        </h1>

        {/* Ephemeral TTL */}
        <div className="mt-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            Ephemeral Messages
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Auto-delete messages after the selected window.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {TTL_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => {
                  setEphemeralTtl(opt.value);
                  showToast({
                    id: crypto.randomUUID(),
                    message: `TTL set to ${opt.label}`,
                    type: "success",
                  });
                }}
                className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                  ephemeralTtl === opt.value
                    ? "border-crimson bg-crimson/20 text-crimson"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Devices */}
        <div className="mt-6 rounded-2xl border border-zinc-800/50 bg-zinc-900/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">
            Device Sessions
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Active sessions tied to your identity keys.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {devices.length === 0 && (
              <p className="text-xs text-zinc-600">No active sessions.</p>
            )}
            {devices.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      d.isCurrent
                        ? "bg-emerald shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        : "bg-zinc-600"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-zinc-200">{d.name}</p>
                    <p className="text-[10px] text-zinc-500">
                      {d.platform} · {d.lastSeen}
                    </p>
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
                    className="rounded-lg border border-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:text-crimson"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Panic */}
        <div className="mt-6 rounded-2xl border border-crimson/40 bg-crimson/10 p-4">
          <h2 className="text-sm font-semibold text-crimson">
            Emergency Panic Shred
          </h2>
          <p className="mt-1 text-xs text-crimson/80">
            Wipe all in-memory state and persistent storage immediately.
          </p>
          <button
            onClick={() => {
              panicShred();
              showToast({
                id: crypto.randomUUID(),
                message: "Vault shredded",
                type: "warning",
              });
            }}
            className="mt-3 rounded-xl border border-crimson/60 px-4 py-2 text-xs font-medium text-crimson transition hover:bg-crimson/20"
          >
            PANIC SHRED
          </button>
        </div>
      </div>
    </div>
  );
}
