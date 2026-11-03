"use client";

import { useState } from "react";

const MOCK_DEVICES = [
  { id: "1", name: "Chrome on Windows", platform: "Windows", lastSeen: "Active now", isCurrent: true },
  { id: "2", name: "Android", platform: "Android", lastSeen: "Last active 2h ago", isCurrent: false },
  { id: "3", name: "Safari on macOS", platform: "macOS", lastSeen: "Active now", isCurrent: false },
];

export default function LinkedDevices() {
  const [devices, setDevices] = useState(MOCK_DEVICES);
  const [showQr, setShowQr] = useState(false);

  const removeDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  };

  const showToast = (toast: { id: string; message: string; type?: "success" | "info" | "warning" }) => {
    console.log("Toast:", toast.message);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Link new device */}
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-5">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent-emerald">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <h2 className="text-sm font-semibold text-on-surface">Link a new device</h2>
        </div>
        <p className="mt-1 text-xs text-outline">
          Scan the QR code with UQZERA on your phone, or enter the pairing code below.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-hairline bg-surface">
            <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <button
            onClick={() => setShowQr(true)}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-on-primary transition hover:bg-primary/90"
          >
            Link a Device
          </button>
        </div>
      </div>

      {/* Active sessions */}
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-5">
        <h2 className="text-sm font-semibold text-on-surface">Active sessions</h2>
        <p className="mt-1 text-xs text-outline">Sessions tied to your identity keys.</p>
        <div className="mt-3 flex flex-col gap-2">
          {devices.length === 0 && (
            <p className="text-xs text-outline-variant">No active sessions.</p>
          )}
          {devices.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between rounded-xl border border-outline-variant/60 bg-surface-container/40 px-3 py-2.5"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${
                    d.isCurrent ? "bg-accent-emerald" : "bg-surface-container"
                  }`}
                />
                <div>
                  <p className="text-sm text-on-surface">{d.name}</p>
                  <p className="text-[10px] text-outline">
                    {d.platform} · {d.lastSeen}
                  </p>
                </div>
              </div>
              {!d.isCurrent && (
                <button
                  onClick={() => {
                    removeDevice(d.id);
                    showToast({ id: crypto.randomUUID(), message: `Revoked ${d.name}`, type: "warning" });
                  }}
                  className="rounded-lg border border-outline-variant px-2.5 py-1 text-[10px] font-medium text-on-surface-variant transition hover:border-status-danger hover:text-status-danger"
                >
                  Log out
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowQr(false)}>
          <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface-container p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-on-surface">Link a Device</h3>
              <button onClick={() => setShowQr(false)} className="p-1 hover:bg-surface rounded">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 flex flex-col items-center gap-3">
              <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-hairline bg-surface">
                <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </div>
              <p className="text-xs text-text-secondary">Scan this QR code with your other device to link it.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
