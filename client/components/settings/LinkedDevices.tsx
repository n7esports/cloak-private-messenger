"use client";

import { useMemo } from "react";
import BoxQRCode from "../icons/BoxQRCode";
import IconCopy from "../icons/IconCopy";
import IconPhone from "../icons/IconPhone";
import type { DeviceSession } from "../../types";

function generatePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I/O/0/1
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => chars[b % chars.length]).join("");
}

export default function LinkedDevices({
  devices,
  removeDevice,
  showToast,
}: {
  devices: DeviceSession[];
  removeDevice: (id: string) => void;
  showToast: (toast: { id: string; message: string; type?: "success" | "info" | "warning" }) => void;
}) {
  const pairingCode = useMemo(() => generatePairingCode(), []);

  const copyCode = () => {
    navigator.clipboard.writeText(pairingCode).catch(() => {});
    showToast({ id: crypto.randomUUID(), message: "Pairing code copied", type: "success" });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Link new device */}
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-5">
        <div className="flex items-center gap-2">
          <IconPhone size={16} className="text-accent-emerald" />
          <h2 className="text-sm font-semibold text-on-surface">Link a new device</h2>
        </div>
        <p className="mt-1 text-xs text-outline">
          Scan the QR code with Cloak on your phone, or enter the pairing code below.
        </p>
        <div className="mt-4 flex flex-col items-center gap-3">
          <BoxQRCode payload={pairingCode} size={180} />
          <div className="flex items-center gap-2">
            <span className="font-mono text-lg tracking-[0.3em] text-accent-emerald">
              {pairingCode.slice(0, 3)}-{pairingCode.slice(3)}
            </span>
            <button
              onClick={copyCode}
              className="rounded-lg border border-outline-variant p-1.5 text-on-surface-variant transition hover:text-accent-emerald"
              aria-label="Copy pairing code"
            >
              <IconCopy size={14} />
            </button>
          </div>
          <p className="text-[10px] text-text-muted">
            Code expires after 10 minutes.
          </p>
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
                    showToast({
                      id: crypto.randomUUID(),
                      message: `Revoked ${d.name}`,
                      type: "warning",
                    });
                  }}
                  className="rounded-lg border border-outline-variant px-2.5 py-1 text-[10px] font-medium text-on-surface-variant transition hover:border-status-danger hover:text-status-danger"
                >
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
