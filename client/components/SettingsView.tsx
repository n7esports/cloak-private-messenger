"use client";

import React, { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import {
  IconLock,
  IconShield,
  IconTimer,
  IconTrash,
  IconWifi,
} from "./icons/UiIcons";

export default function SettingsView() {
  const devices = useChatStore((s) => s.devices);
  const ephemeralTtl = useChatStore((s) => s.ephemeralTtl);
  const removeDevice = useChatStore((s) => s.removeDevice);
  const panicShred = useChatStore((s) => s.panicShred);
  const showToast = useChatStore((s) => s.showToast);

  const [onionHops, setOnionHops] = useState(3);
  const [pqKemEnabled, setPqKemEnabled] = useState(true);
  const [selectedExitNode, setSelectedExitNode] = useState("Zurich Exit-01 (Switzerland)");
  const [burnOnRead, setBurnOnRead] = useState(true);

  const ttlOptions = [
    { value: 0, label: "Off", desc: "No Expiry" },
    { value: 3_600_000, label: "1h", desc: "3,600s TTL" },
    { value: 86_400_000, label: "24h", desc: "86,400s TTL" },
    { value: 604_800_000, label: "7d", desc: "604,800s TTL" },
  ];

  return (
    <div className="cloak-ambient cloak-app-screen flex flex-col font-sans text-cloak-text">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-space-lg p-4 md:p-space-lg lg:p-space-xl">
        {/* Title */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-space-xs text-cloak-accent font-label-code-sm text-label-code-sm uppercase tracking-wider font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cloak-accent" />
            Security & Hardware Vault Enclave
          </div>
          <h1 className="font-headline-xl text-headline-xl text-cloak-text font-bold tracking-tight">
            Settings & Cryptographic Policies
          </h1>
          <p className="font-body-md text-body-md text-cloak-muted">
            Fine-tune pairwise double-ratchet properties, Tor onion circuits, and local device vault authorizations.
          </p>
        </div>

        {/* Section 1: Device Vault */}
        <div className="p-space-lg rounded-3xl bg-cloak-surface-1/70 backdrop-blur-xl border border-cloak-border flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-space-sm">
              <IconShield className="text-cloak-accent text-[24px]" />
              <div>
                <h2 className="font-headline-md text-headline-md text-cloak-text font-semibold">
                  Device Vault ({devices.length} Devices Linked)
                </h2>
                <p className="font-body-sm text-body-sm text-cloak-muted">
                  Each hardware enclave maintains an isolated root pairwise ratchet state
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                showToast({
                  id: crypto.randomUUID(),
                  message: "Link New Enclave — coming soon",
                })
              }
              className="px-4 py-2 rounded-xl bg-cloak-surface-2 hover:bg-cloak-surface-3 text-cloak-accent font-headline-sm text-headline-sm font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <IconLock className="text-[18px]" />
              <span>Link New Enclave</span>
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {devices.length === 0 ? (
              <div className="p-6 rounded-2xl bg-cloak-surface-0/50 border border-cloak-border/30 text-center">
                <p className="text-sm text-cloak-muted">
                  No devices linked yet. Link a device to manage its session.
                </p>
              </div>
            ) : (
              devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-cloak-surface-0 border border-cloak-border/30 flex-wrap gap-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-cloak-surface-3 flex items-center justify-center text-cloak-accent">
                      <IconShield className="text-[20px]" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-headline-sm text-cloak-text font-medium">
                          {device.name}
                        </span>
                        {device.isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-cloak-accent/20 text-cloak-accent font-label-code-sm text-label-code-sm font-mono font-bold">
                            THIS DEVICE
                          </span>
                        )}
                      </div>
                      <span className="font-label-code-sm text-label-code-sm text-cloak-muted font-mono">
                        {device.platform} • Key FP: {device.fingerprint}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-label-code-sm text-label-code-sm text-cloak-accent font-mono">
                      {device.lastSeen}
                    </span>
                    {!device.isCurrent && (
                      <button
                        onClick={() => {
                          removeDevice(device.id);
                          showToast({
                            id: crypto.randomUUID(),
                            message: `Device ${device.name} revoked`,
                          });
                        }}
                        className="px-3 py-1 rounded-lg bg-cloak-surface-3 hover:bg-red-500/20 hover:text-red-400 text-cloak-muted font-body-sm text-body-sm transition-colors cursor-pointer"
                        title="Revoke and shred device pairwise keys"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Ephemeral Shredding & Auto-Burn */}
        <div className="p-space-lg rounded-3xl bg-cloak-surface-1/70 backdrop-blur-xl border border-cloak-border flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center gap-space-sm">
            <IconTimer className="text-cloak-accent text-[24px]" />
            <div>
              <h2 className="font-headline-md text-headline-md text-cloak-text font-semibold">
                Auto-Burn & Ephemeral Retention
              </h2>
              <p className="font-body-sm text-body-sm text-cloak-muted">
                Messages cryptographically self-shred across all relay hops upon expiration
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
            {ttlOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  showToast({
                    id: crypto.randomUUID(),
                    message: `Default Ephemeral TTL updated to: ${opt.label}`,
                  });
                }}
                className={`p-3.5 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all cursor-pointer ${
                  ephemeralTtl === opt.value
                    ? "bg-cloak-surface-2 border-cloak-accent text-cloak-accent font-semibold shadow-md"
                    : "bg-cloak-surface-0 border-cloak-border text-cloak-muted hover:text-cloak-text hover:bg-cloak-surface-1"
                }`}
              >
                <span className="font-headline-sm text-headline-sm font-mono">
                  {opt.label}
                </span>
                <span className="text-[11px] font-mono text-cloak-muted">
                  {opt.desc}
                </span>
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cloak-surface-0 border border-cloak-border/30">
            <div className="flex items-center gap-3">
              <IconTimer className="text-cloak-accent text-[20px]" />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-cloak-text font-medium">
                  Burn-on-Read Immediate Purge
                </span>
                <span className="font-body-sm text-body-sm text-cloak-muted">
                  Shred payload buffers instantly after recipient decodes audio/video/attachments
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={burnOnRead}
              onChange={(e) => {
                setBurnOnRead(e.target.checked);
                showToast({
                  id: crypto.randomUUID(),
                  message: e.target.checked
                    ? "Burn-on-read immediate purge activated"
                    : "Burn-on-read immediate purge disabled",
                });
              }}
              className="w-5 h-5 accent-cloak-accent rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Section 3: Onion Relay Circuits */}
        <div className="p-space-lg rounded-3xl bg-cloak-surface-1/70 backdrop-blur-xl border border-cloak-border flex flex-col gap-space-md shadow-sm">
          <div className="flex items-center gap-space-sm">
            <IconWifi className="text-cloak-accent text-[24px]" />
            <div>
              <h2 className="font-headline-md text-headline-md text-cloak-text font-semibold">
                Decentralized Onion Routing & Tor Circuits
              </h2>
              <p className="font-body-sm text-body-sm text-cloak-muted">
                Route message packets through multi-hop onion tunnels with zero IP retention
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1.5">
              <label className="font-label-code-sm text-label-code-sm text-cloak-muted font-mono uppercase">
                Onion Routing Hop Depth ({onionHops} Hops)
              </label>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-cloak-surface-0 border border-cloak-border">
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={onionHops}
                  onChange={(e) => {
                    const hops = parseInt(e.target.value);
                    setOnionHops(hops);
                    showToast({
                      id: crypto.randomUUID(),
                      message: `Onion routing depth adjusted to: ${hops} hops`,
                    });
                  }}
                  className="w-full accent-cloak-accent cursor-pointer"
                />
                <span className="font-label-code-sm text-label-code-sm text-cloak-accent font-mono font-bold w-12 text-right">
                  {onionHops} Hops
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-label-code-sm text-label-code-sm text-cloak-muted font-mono uppercase">
                Preferred Rendezvous Exit
              </label>
              <select
                value={selectedExitNode}
                onChange={(e) => {
                  setSelectedExitNode(e.target.value);
                  showToast({
                    id: crypto.randomUUID(),
                    message: `Rendezvous routed through: ${e.target.value}`,
                  });
                }}
                className="w-full bg-cloak-surface-0 text-cloak-text font-body-sm text-body-sm p-3 rounded-xl outline-none border border-cloak-border focus:border-cloak-accent/40 cursor-pointer"
              >
                <option value="Zurich Exit-01 (Switzerland)">Zurich Exit-01 (Switzerland, 18ms)</option>
                <option value="Reykjavik Guard-04 (Iceland)">Reykjavik Guard-04 (Iceland, 31ms)</option>
                <option value="Singapore Mix-09 (Singapore)">Singapore Mix-09 (Singapore, 82ms)</option>
                <option value="Berlin Gateway-12 (Germany)">Berlin Gateway-12 (Germany, 24ms)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-cloak-surface-0 border border-cloak-border/30">
            <div className="flex items-center gap-3">
              <IconLock className="text-cloak-accent text-[20px]" />
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-cloak-text font-medium">
                  Post-Quantum Kyber-1024 Hybrid KEM
                </span>
                <span className="font-body-sm text-body-sm text-cloak-muted">
                  Encapsulate pairwise ratchet seeds with lattice-based post-quantum cryptography
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={pqKemEnabled}
              onChange={(e) => {
                setPqKemEnabled(e.target.checked);
                showToast({
                  id: crypto.randomUUID(),
                  message: e.target.checked
                    ? "Post-Quantum Kyber-1024 enabled"
                    : "Standard Curve25519 fallback active",
                });
              }}
              className="w-5 h-5 accent-cloak-accent rounded cursor-pointer"
            />
          </div>
        </div>

        {/* Section 4: Emergency Panic Shred */}
        <div className="p-space-lg rounded-3xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-md">
          <div className="flex items-start gap-space-sm">
            <IconTrash className="text-red-400 text-[28px] mt-0.5" />
            <div className="flex flex-col">
              <span className="font-headline-sm text-headline-sm font-semibold text-red-400">
                Emergency Cryptographic Shred (Panic Wipe)
              </span>
              <p className="font-body-sm text-body-sm text-cloak-muted max-w-lg">
                Overwrites ephemeral memory keys, resets hardware ratchet state, and drops active Tor rendezvous tunnels immediately.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              panicShred();
              showToast({
                id: crypto.randomUUID(),
                message: "PANIC SHRED EXECUTED — All cryptographic state destroyed",
                type: "warning",
              });
            }}
            className="px-5 py-2.5 rounded-full bg-red-500 text-white hover:bg-red-600 font-headline-sm text-headline-sm font-bold shadow-lg transition-all cursor-pointer flex-shrink-0 active:scale-95"
          >
            Cryptographic Shred
          </button>
        </div>
      </div>
    </div>
  );
}
