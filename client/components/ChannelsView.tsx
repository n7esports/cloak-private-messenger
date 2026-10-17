"use client";

import React, { useState, useEffect } from "react";
import { useChatStore } from "../store/useChatStore";
import type { Channel, Broadcast } from "../types";
import {
  IconBroadcast,
  IconCheckDouble,
  IconClose,
  IconCopy,
  IconLock,
  IconPlus,
  IconSearch,
  IconSend,
  IconShield,
  IconTimer,
  IconUsers,
  IconWifi,
} from "./icons/UiIcons";

const CHANNEL_ICONS: Record<string, string> = {
  "security-alerts": "shield",
  "quantum-keys": "lock",
  "mesh-nodes": "wifi",
  "broadcast": "broadcast",
  "default": "broadcast",
};

function formatCountdown(h: number, m: number, s: number): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `T-${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function ChannelsView() {
  const channels = useChatStore((s) => s.channels);
  const addChannel = useChatStore((s) => s.addChannel);
  const showToast = useChatStore((s) => s.showToast);

  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    channels[0]?.id ?? "",
  );
  const [filterCategory, setFilterCategory] = useState<"all" | "broadcast" | "private">("all");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newChannelHandle, setNewChannelHandle] = useState("");
  const [newChannelType, setNewChannelType] = useState<"broadcast" | "public">("broadcast");
  const [newChannelTtl, setNewChannelTtl] = useState(true);
  const [broadcastDraft, setBroadcastDraft] = useState("");
  const [activeBroadcasts, setActiveBroadcasts] = useState<Record<string, Broadcast[]>>({});
  const [timeLeft, setTimeLeft] = useState({ h: 3, m: 57, s: 42 });

  // Live countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { h, m, s } = prev;
        if (s > 0) s--;
        else if (m > 0) { m--; s = 59; }
        else if (h > 0) { h--; m = 59; s = 59; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedChannel =
    channels.find((c) => c.id === selectedChannelId) || channels[0];

  const filteredChannels = channels.filter((c) => {
    if (filterCategory === "all") return true;
    if (filterCategory === "broadcast") return c.category === "broadcast";
    if (filterCategory === "private") return c.category === "private";
    return true;
  });

  const allBroadcasts = [
    ...(selectedChannel?.broadcasts || []),
    ...(activeBroadcasts[selectedChannel?.id ?? ""] || []),
  ];

  const handlePostBroadcast = () => {
    const text = broadcastDraft.trim();
    if (!text || !selectedChannel) return;

    const now = new Date();
    const timeStr = `${now.getUTCHours().toString().padStart(2, "0")}:${now
      .getUTCMinutes()
      .toString()
      .padStart(2, "0")}:${now.getUTCSeconds().toString().padStart(2, "0")} UTC`;

    const newBroadcast: Broadcast = {
      id: `bc-${Date.now()}`,
      sender: "SecOps Dispatch Node #01",
      senderNode: "Node #01",
      signature: "SIG: ed25519::7f82c...991a",
      hashMatch: "SHA-256 MATCH",
      content: text,
      timestamp: timeStr,
      relayedByCount: 16,
      payloadSize: `${Math.max(120, text.length * 3)} Bytes`,
    };

    setActiveBroadcasts((prev) => ({
      ...prev,
      [selectedChannel.id]: [newBroadcast, ...(prev[selectedChannel.id] || [])],
    }));
    setBroadcastDraft("");
    showToast({
      id: crypto.randomUUID(),
      message: `Broadcast relayed across 16 mesh nodes to ${selectedChannel.name}`,
    });
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const handle = newChannelHandle.trim().replace(/^#/, "");
    if (!handle) return;

    const id = handle.toLowerCase().replace(/\s+/g, "-");
    const created: Channel = {
      id,
      name: `#${id}`,
      icon: newChannelType === "broadcast" ? "broadcast" : "users",
      gradient: "from-cloak-surface-2 via-cloak-surface-1 to-cloak-accent/20",
      memberCount: 1,
      category: newChannelType,
      lastActivity: "Just now",
      lastSnippet: "Topic enclave deployed to relay swarm",
      verified: true,
      idHash: `0x${Math.random().toString(16).substring(2, 6)}..${Math.random().toString(16).substring(2, 6)}`,
      broadcastOnly: newChannelType === "broadcast",
      ephemeralHours: newChannelTtl ? 24 : 0,
      broadcasts: [],
    };

    addChannel(created);
    setSelectedChannelId(id);
    setCreateModalOpen(false);
    setNewChannelHandle("");
    showToast({
      id: crypto.randomUUID(),
      message: `Channel #${handle} generated with Ed25519 keypair`,
    });
  };

  const copyFingerprint = (fp: string) => {
    navigator.clipboard?.writeText(fp.replace(/\s+/g, ""));
    showToast({
      id: crypto.randomUUID(),
      message: "Mandatory Node Fingerprint copied",
    });
  };

  return (
    <div className="cloak-ambient cloak-app-screen flex flex-col font-sans text-cloak-text">
      <div className="relative w-full overflow-hidden px-4 md:px-margin py-space-lg flex flex-col gap-space-lg">
        {/* Ambient backdrops */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cloak-accent/5 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-cloak-accent/5 blur-[120px] pointer-events-none" />

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md z-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-space-xs text-cloak-accent font-label-code-sm text-label-code-sm uppercase tracking-wider font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cloak-accent animate-pulse" />
              Decentralized Topic Mesh
            </div>
            <h1 className="font-headline-xl text-headline-xl text-cloak-text font-bold tracking-tight">
              Encrypted Channels & Broadcasts
            </h1>
            <p className="font-body-md text-body-md text-cloak-muted max-w-xl">
              Cryptographically isolated multi-party relays. Zero metadata leakage,
              deterministic forward secrecy, and verifiable onion routing.
            </p>
          </div>

          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="flex items-center gap-space-xs bg-cloak-surface-0 px-space-sm py-2 rounded-xl text-cloak-muted shadow-sm border border-cloak-border">
              <IconWifi className="text-[18px] text-cloak-accent" />
              <span className="text-xs font-mono text-cloak-text">
                RELAYS: {channels.length}/{channels.length} SYNCED
              </span>
            </div>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="group flex items-center gap-space-xs bg-cloak-accent text-cloak-base px-space-md py-2.5 rounded-full font-headline-sm text-headline-sm font-semibold shadow-[0_0_20px_rgba(78,222,163,0.25)] hover:bg-cloak-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              type="button"
            >
              <IconPlus className="text-[20px] transition-transform group-hover:rotate-90" />
              <span>Create Channel</span>
            </button>
          </div>
        </div>

        {/* Main 2-Column Section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg z-10 items-start">
          {/* Left Column: Channels list */}
          <div className="xl:col-span-5 flex flex-col gap-space-md">
            <div className="flex items-center justify-between px-space-xs">
              <div className="flex items-center gap-space-xs">
                <span className="text-sm text-cloak-text font-semibold">
                  Active Channels
                </span>
                <span className="bg-cloak-surface-2 text-cloak-accent px-2 py-0.5 rounded-full font-label-code-sm text-label-code-sm font-mono">
                  {channels.length} Total
                </span>
              </div>
              <div className="flex items-center gap-1 bg-cloak-surface-0 p-1 rounded-lg border border-cloak-border/30">
                {(["all", "broadcast", "private"] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={`px-2.5 py-1 rounded font-label-code-sm text-label-code-sm font-medium transition-colors cursor-pointer ${
                      filterCategory === cat
                        ? "bg-cloak-surface-2 text-cloak-text shadow-sm"
                        : "text-cloak-muted hover:text-cloak-text"
                    }`}
                  >
                    {cat === "all" ? "All" : cat === "broadcast" ? "Broadcasts" : "Private"}
                  </button>
                ))}
              </div>
            </div>

            {/* List */}
            <div className="flex flex-col gap-space-sm">
              {filteredChannels.length === 0 ? (
                <div className="p-8 rounded-2xl bg-cloak-surface-0/50 border border-cloak-border/30 text-center">
                  <IconBroadcast className="mx-auto mb-3 text-cloak-dim text-[32px]" />
                  <p className="font-body-sm text-body-sm text-cloak-muted">
                    No channels found. Create one to get started.
                  </p>
                </div>
              ) : (
                filteredChannels.map((ch) => {
                  const isSelected = ch.id === selectedChannelId;
                  return (
                    <div
                      key={ch.id}
                      onClick={() => setSelectedChannelId(ch.id)}
                      className={`cursor-pointer group relative flex items-center justify-between p-space-md rounded-xl shadow-sm transition-all border border-cloak-border ${
                        isSelected
                          ? "bg-cloak-surface-2 shadow-md hover:bg-cloak-surface-3 border-cloak-accent/30"
                          : "bg-cloak-surface-0 hover:bg-cloak-surface-1"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute left-0 top-2 bottom-2 w-1 bg-cloak-accent rounded-r" />
                      )}

                      <div className="flex items-center gap-space-md min-w-0">
                        <div
                          className={`relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${ch.gradient} flex items-center justify-center shadow-inner`}
                        >
                          <IconBroadcast className="text-cloak-accent text-[24px]" />
                          {ch.unread && (
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-cloak-accent rounded-full ring-2 ring-cloak-bg" />
                          )}
                        </div>

                        <div className="min-w-0 flex flex-col gap-0.5">
                          <div className="flex items-center gap-space-xs">
                            <span className="text-sm font-semibold text-cloak-text group-hover:text-cloak-accent transition-colors truncate">
                              {ch.name}
                            </span>
                            <IconLock className="text-cloak-accent text-[16px]" />
                          </div>
                          <div className="flex items-center gap-space-sm text-cloak-muted text-sm">
                            <span className="flex items-center gap-1">
                              <IconUsers className="text-[14px]" />
                              <span>{ch.memberCount.toLocaleString()}</span>
                            </span>
                            <span>•</span>
                            <span className="font-label-code-sm text-label-code-sm text-cloak-accent truncate">
                              {ch.lastSnippet}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                        <span className="font-label-code-sm text-label-code-sm text-cloak-muted">
                          {ch.lastActivity}
                        </span>
                        {ch.unread && (
                          <span className="px-2 py-0.5 rounded-full bg-cloak-accent/10 text-cloak-accent font-label-code-sm text-label-code-sm font-mono font-bold">
                            NEW
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Decentralized Mesh Health Widget */}
            <div className="p-space-md rounded-2xl bg-cloak-surface-0 shadow-sm flex flex-col gap-space-sm border border-cloak-border">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-headline-sm text-cloak-text font-semibold">
                  Decentralized Mesh Health
                </span>
                <span className="text-xs font-mono text-cloak-accent">
                  99.98%
                </span>
              </div>
              <div className="w-full bg-cloak-surface-0 h-2 rounded-full overflow-hidden flex">
                <div className="bg-cloak-accent h-full w-[88%] rounded-full" />
                <div className="bg-cloak-accent/60 h-full w-[10%]" />
                <div className="bg-cloak-border h-full w-[2%]" />
              </div>
              <div className="flex items-center justify-between text-cloak-muted font-label-code-sm text-label-code-sm">
                <span>Primary Ingress: 18 Nodes</span>
                <span>Relay Latency: &lt;18ms</span>
              </div>
            </div>
          </div>

          {/* Right Column: Channel Feed & Dispatcher */}
          <div className="xl:col-span-7 flex flex-col gap-space-md">
            {selectedChannel ? (
              <div className="relative rounded-3xl bg-cloak-surface-2/90 backdrop-blur-2xl shadow-xl overflow-hidden flex flex-col border border-cloak-border/60">
                <div className="absolute -right-24 -top-24 w-72 h-72 rounded-full bg-cloak-accent/10 blur-3xl pointer-events-none" />

                {/* Channel Header Banner */}
                <div className="p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-cloak-surface-3/50 border-b border-cloak-border">
                  <div className="flex items-center gap-space-md">
                    <div
                      className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${selectedChannel.gradient} flex items-center justify-center shadow-lg`}
                    >
                      <IconBroadcast className="text-cloak-accent text-[32px]" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <h2 className="font-headline-lg text-headline-lg font-bold text-cloak-text">
                          {selectedChannel.name}
                        </h2>
                        <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-cloak-accent/15 text-cloak-accent font-label-code-sm text-label-code-sm font-mono border border-cloak-accent/20">
                          <IconShield className="text-[14px]" />
                          <span>VERIFIED BROADCAST</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-space-sm text-cloak-muted font-body-sm text-body-sm flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-cloak-text">
                          <IconUsers className="text-[16px] text-cloak-accent" />
                          <span>{selectedChannel.memberCount.toLocaleString()} members</span>
                        </span>
                        <span>•</span>
                        <span>
                          {selectedChannel.broadcastOnly
                            ? "Broadcast-only thread"
                            : "Multi-party discussion"}
                        </span>
                        <span>•</span>
                        <span className="text-cloak-accent font-mono">
                          ID: {selectedChannel.idHash}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-xs self-start md:self-auto">
                    <button
                      onClick={() =>
                        showToast({
                          id: crypto.randomUUID(),
                          message: `Channel Keypair verified: ${selectedChannel.name} (ED25519)`,
                        })
                      }
                      className="p-2 rounded-xl bg-cloak-surface-1 hover:bg-cloak-surface-2 text-cloak-muted hover:text-cloak-text transition-colors cursor-pointer"
                      title="Channel Key Export"
                    >
                      <IconLock className="text-[20px]" />
                    </button>
                    <button
                      onClick={() =>
                        showToast({
                          id: crypto.randomUUID(),
                          message: "Notification level: Real-time cryptographic alerts active",
                        })
                      }
                      className="p-2 rounded-xl bg-cloak-surface-1 hover:bg-cloak-surface-2 text-cloak-muted hover:text-cloak-text transition-colors cursor-pointer"
                      title="Notification Preferences"
                    >
                      <IconTimer className="text-[20px]" />
                    </button>
                  </div>
                </div>

                {/* Subscribers & Ephemeral Cache Strip */}
                <div className="px-space-lg py-space-md bg-cloak-surface-1 flex flex-col md:flex-row md:items-center justify-between gap-space-sm border-b border-cloak-border">
                  <div className="flex items-center gap-space-sm">
                    <span className="font-label-code-sm text-label-code-sm text-cloak-muted uppercase tracking-wider font-semibold font-mono">
                      Subscribers:
                    </span>
                    <div className="flex items-center -space-x-2">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-cloak-accent/30 to-cloak-accent/10 ring-2 ring-cloak-surface-2 flex items-center justify-center text-xs font-bold text-cloak-accent"
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                      ))}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cloak-surface-3 text-cloak-accent font-label-code-sm text-label-code-sm font-mono font-bold ring-2 ring-cloak-surface-2">
                        +1.4k
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-space-xs text-cloak-muted font-label-code-sm text-label-code-sm">
                    <span className="w-2 h-2 rounded-full bg-cloak-accent animate-pulse" />
                    <span>
                      Ephemeral Cache:{" "}
                      <strong className="text-cloak-text font-mono">
                        {selectedChannel.ephemeralHours}h Remaining
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Broadcasts Thread */}
                <div className="p-space-lg flex flex-col gap-space-lg">
                  <div className="flex items-center gap-space-md">
                    <div className="flex-1 h-px bg-cloak-border" />
                    <span className="px-3 py-1 rounded-full bg-cloak-surface-0 font-label-code-sm text-label-code-sm text-cloak-muted font-mono uppercase tracking-wider border border-cloak-border/40">
                      Today • Authenticated Broadcast
                    </span>
                    <div className="flex-1 h-px bg-cloak-border" />
                  </div>

                  {allBroadcasts.length === 0 ? (
                    <div className="p-8 text-center text-cloak-muted text-body-sm font-body-sm bg-cloak-surface-0/50 rounded-2xl border border-cloak-border/30">
                      No broadcasts dispatched yet in this channel. Compose an advisory below.
                    </div>
                  ) : (
                    allBroadcasts.map((bc) => (
                      <div
                        key={bc.id}
                        className="flex flex-col gap-space-sm bg-cloak-surface-0/70 p-space-lg rounded-2xl shadow-sm border border-cloak-border"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-space-sm">
                            <div className="w-8 h-8 rounded-lg bg-cloak-accent/20 text-cloak-accent flex items-center justify-center font-bold text-headline-sm">
                              {bc.sender.charAt(0)}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-headline-sm text-headline-sm font-semibold text-cloak-text">
                                {bc.sender}
                              </span>
                              <span className="font-label-code-sm text-label-code-sm text-cloak-accent font-mono">
                                {bc.signature}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-space-xs bg-cloak-surface-2 px-2.5 py-1 rounded-lg border border-cloak-border/40">
                            <IconShield className="text-cloak-accent text-[16px]" />
                            <span className="font-label-code-sm text-label-code-sm text-cloak-text font-mono">
                              {bc.hashMatch}
                            </span>
                          </div>
                        </div>

                        <div className="mt-2 text-cloak-text font-body-lg text-body-lg leading-relaxed">
                          {bc.content}
                        </div>

                        {bc.fingerprint && (
                          <div className="mt-space-sm p-space-md rounded-xl bg-cloak-surface-2/60 flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm border border-cloak-border/40">
                            <div className="flex items-center gap-space-sm">
                              <IconLock className="text-cloak-accent text-[22px]" />
                              <div className="flex flex-col">
                                <span className="font-label-code-sm text-label-code-sm text-cloak-muted uppercase font-medium font-mono">
                                  Mandatory Node Fingerprint
                                </span>
                                <span className="font-label-code-md text-label-code-md font-mono text-cloak-text selection:bg-cloak-accent/30">
                                  {bc.fingerprint}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => copyFingerprint(bc.fingerprint!)}
                              className="self-start sm:self-auto px-3 py-1.5 rounded-lg bg-cloak-surface-3 hover:bg-cloak-surface-2 text-cloak-accent font-label-code-sm text-label-code-sm font-mono flex items-center gap-1 transition-colors cursor-pointer"
                              type="button"
                            >
                              <IconCopy className="text-[16px]" />
                              <span>Copy FP</span>
                            </button>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-space-xs text-cloak-muted font-label-code-sm text-label-code-sm border-t border-cloak-border/30">
                          <div className="flex items-center gap-space-md">
                            <span className="flex items-center gap-1 text-cloak-accent">
                              <IconCheckDouble className="text-[16px]" />
                              <span>Relayed by {bc.relayedByCount} nodes</span>
                            </span>
                            <span>Payload: {bc.payloadSize}</span>
                          </div>
                          <span className="font-mono">{bc.timestamp}</span>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Scheduled Pipeline Notice */}
                  <div className="p-space-md rounded-2xl bg-cloak-surface-0 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md border border-cloak-border">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded-xl bg-cloak-accent/20 text-cloak-accent flex items-center justify-center flex-shrink-0">
                        <IconTimer className="text-[20px]" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm font-semibold text-cloak-text">
                          Scheduled Broadcast Pipeline
                        </span>
                        <span className="font-body-sm text-body-sm text-cloak-muted">
                          Scheduled for automatic relay execution at 18:00 UTC
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-space-xs">
                      <span className="px-2.5 py-1 rounded-full bg-cloak-surface-3 text-cloak-accent font-label-code-sm text-label-code-sm font-mono font-bold tracking-wider">
                        {formatCountdown(timeLeft.h, timeLeft.m, timeLeft.s)}
                      </span>
                      <IconLock className="text-cloak-border text-[18px]" />
                    </div>
                  </div>
                </div>

                {/* Broadcast Dispatcher */}
                <div className="p-space-lg bg-cloak-surface-3/70 flex flex-col gap-space-sm border-t border-cloak-border">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-sm text-headline-sm text-cloak-text font-semibold flex items-center gap-1.5">
                      <IconBroadcast className="text-cloak-accent text-[20px]" />
                      Broadcast Dispatcher
                    </span>
                    <span className="font-label-code-sm text-label-code-sm text-cloak-muted font-mono">
                      ROLE: NODE OPERATOR
                    </span>
                  </div>

                  <div className="relative flex flex-col bg-cloak-surface-0 rounded-2xl p-space-sm shadow-inner border border-cloak-border">
                    <textarea
                      value={broadcastDraft}
                      onChange={(e) => setBroadcastDraft(e.target.value)}
                      className="w-full bg-transparent text-cloak-text placeholder:text-cloak-dim/50 font-body-md text-body-md p-space-sm outline-none resize-none"
                      placeholder="Compose verifiable encrypted broadcast advisory..."
                      rows={3}
                    />
                    <div className="flex items-center justify-between pt-space-xs px-space-xs flex-wrap gap-2 border-t border-cloak-border/30">
                      <div className="flex items-center gap-space-xs">
                        <button
                          onClick={() =>
                            showToast({
                              id: crypto.randomUUID(),
                              message: "GPG signature envelope attached to broadcast payload",
                            })
                          }
                          className="p-2 rounded-lg text-cloak-muted hover:text-cloak-text hover:bg-cloak-surface-2 transition-colors cursor-pointer"
                          title="Attach GPG Signature"
                          type="button"
                        >
                          <IconLock className="text-[20px]" />
                        </button>
                        <button
                          onClick={() =>
                            showToast({
                              id: crypto.randomUUID(),
                              message: "SHA-256 payload digest verified and attached",
                            })
                          }
                          className="p-2 rounded-lg text-cloak-muted hover:text-cloak-text hover:bg-cloak-surface-2 transition-colors cursor-pointer"
                          title="Add File / Hash digest"
                          type="button"
                        >
                          <IconBroadcast className="text-[20px]" />
                        </button>
                        <button
                          onClick={() =>
                            showToast({
                              id: crypto.randomUUID(),
                              message: "Burn-on-read TTL scheduled: 24h retention limit",
                            })
                          }
                          className="p-2 rounded-lg text-cloak-muted hover:text-cloak-text hover:bg-cloak-surface-2 transition-colors cursor-pointer"
                          title="Burn on read expiration"
                          type="button"
                        >
                          <IconTimer className="text-[20px]" />
                        </button>
                        <span className="w-px h-5 bg-cloak-border mx-1" />
                        <span className="font-label-code-sm text-label-code-sm text-cloak-accent font-mono hidden sm:inline">
                          GPG AUTO-SIGN ACTIVE
                        </span>
                      </div>
                      <button
                        onClick={handlePostBroadcast}
                        disabled={!broadcastDraft.trim()}
                        className={`flex items-center gap-space-xs px-space-lg py-2.5 rounded-full font-headline-sm text-headline-sm font-semibold transition-all ${
                          broadcastDraft.trim()
                            ? "bg-cloak-accent text-cloak-base shadow-[0_0_16px_rgba(78,222,163,0.3)] hover:bg-cloak-accent-hover hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                            : "bg-cloak-surface-3 text-cloak-muted cursor-not-allowed opacity-60"
                        }`}
                        type="button"
                      >
                        <IconSend className="text-[18px]" />
                        <span>Broadcast to Channel</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 rounded-3xl bg-cloak-surface-1/50 border border-cloak-border">
                <IconBroadcast className="mb-4 text-cloak-dim text-[48px]" />
                <h3 className="font-headline-md text-headline-md font-semibold text-cloak-text">
                  No channels yet
                </h3>
                <p className="mt-2 text-sm text-cloak-muted text-center max-w-md">
                  Create a channel to start broadcasting encrypted messages to your mesh network.
                </p>
                <button
                  onClick={() => setCreateModalOpen(true)}
                  className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-full bg-cloak-accent text-cloak-base font-headline-sm text-headline-sm font-semibold hover:bg-cloak-accent-hover transition-all cursor-pointer"
                >
                  <IconPlus className="text-[18px]" />
                  Create Channel
                </button>
              </div>
            )}

            {/* Explanatory Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              <div className="p-space-md rounded-2xl bg-cloak-surface-0 shadow-sm flex items-start gap-space-md border border-cloak-border">
                <div className="w-10 h-10 rounded-xl bg-cloak-accent/10 text-cloak-accent flex items-center justify-center flex-shrink-0">
                  <IconShield className="text-[22px]" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-headline-sm text-headline-sm font-semibold text-cloak-text">
                    Double-Ratchet Mesh
                  </span>
                  <p className="text-sm text-cloak-muted leading-relaxed">
                    Every broadcast header carries ratcheted root ephemeral keys.
                    Compromised nodes cannot reconstruct prior advisory streams.
                  </p>
                </div>
              </div>

              <div className="p-space-md rounded-2xl bg-cloak-surface-0 shadow-sm flex items-start gap-space-md border border-cloak-border">
                <div className="w-10 h-10 rounded-xl bg-cloak-accent/10 text-cloak-accent flex items-center justify-center flex-shrink-0">
                  <IconLock className="text-[22px]" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-headline-sm text-headline-sm font-semibold text-cloak-text">
                    Zero Metadata Registry
                  </span>
                  <p className="text-sm text-cloak-muted leading-relaxed">
                    Subscriber IP mappings are never recorded on disk. Relays retain
                    ephemeral routing tables strictly in volatile RAM.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create New Channel Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-cloak-bg/80 backdrop-blur-md flex items-center justify-center p-space-md animate-in fade-in duration-200">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-3xl bg-cloak-surface-2 shadow-2xl p-space-xl flex flex-col gap-space-lg relative border border-cloak-border/60 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <div className="w-10 h-10 rounded-xl bg-cloak-accent/20 text-cloak-accent flex items-center justify-center">
                  <IconBroadcast className="text-[22px]" />
                </div>
                <div>
                  <h3 className="font-headline-lg text-headline-lg font-bold text-cloak-text">
                    Create New Channel
                  </h3>
                  <p className="font-body-sm text-body-sm text-cloak-muted">
                    Deploy an isolated topic feed across peer relays
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-2 rounded-full text-cloak-muted hover:text-cloak-text hover:bg-cloak-surface-3 transition-colors cursor-pointer"
                type="button"
              >
                <IconClose />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col gap-space-md">
              <div className="flex flex-col gap-1.5">
                <label className="font-label-code-sm text-label-code-sm text-cloak-text uppercase font-medium font-mono">
                  Channel Handle
                </label>
                <div className="flex items-center bg-cloak-surface-0 px-space-md py-2.5 rounded-xl text-cloak-text font-body-md text-body-md border border-cloak-border focus-within:border-cloak-accent/40">
                  <span className="text-cloak-accent font-mono mr-1">#</span>
                  <input
                    value={newChannelHandle}
                    onChange={(e) => setNewChannelHandle(e.target.value)}
                    className="bg-transparent flex-1 outline-none text-cloak-text placeholder:text-cloak-dim/50 font-mono"
                    placeholder="e.g. quantum-keys-updates"
                    type="text"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-label-code-sm text-label-code-sm text-cloak-text uppercase font-medium font-mono">
                  Channel Type
                </label>
                <div className="grid grid-cols-2 gap-space-sm">
                  {(
                    [
                      { key: "broadcast", label: "Broadcast", desc: "Only approved signers can dispatch messages." },
                      { key: "public", label: "Multi-Peer", desc: "All verified keyholders can converse." },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.key}
                      onClick={() => setNewChannelType(opt.key)}
                      className={`flex flex-col p-space-md rounded-xl cursor-pointer transition-colors border ${
                        newChannelType === opt.key
                          ? "bg-cloak-surface-1 border-cloak-accent/40"
                          : "bg-cloak-surface-0 border-cloak-border hover:bg-cloak-surface-1"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-headline-sm text-headline-sm font-semibold text-cloak-text">
                          {opt.label}
                        </span>
                        <input
                          checked={newChannelType === opt.key}
                          onChange={() => setNewChannelType(opt.key)}
                          className="accent-cloak-accent"
                          name="ch-type"
                          type="radio"
                        />
                      </div>
                      <span className="font-body-sm text-body-sm text-cloak-muted">
                        {opt.desc}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-space-md rounded-xl bg-cloak-surface-0 border border-cloak-border">
                <div className="flex items-center gap-space-sm">
                  <IconTimer className="text-cloak-accent text-[20px]" />
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-headline-sm font-semibold text-cloak-text">
                      Default Ephemeral TTL
                    </span>
                    <span className="font-body-sm text-body-sm text-cloak-muted">
                      Purge messages after 24 hours
                    </span>
                  </div>
                </div>
                <input
                  checked={newChannelTtl}
                  onChange={(e) => setNewChannelTtl(e.target.checked)}
                  className="w-5 h-5 accent-cloak-accent rounded cursor-pointer"
                  type="checkbox"
                />
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-xs">
                <button
                  onClick={() => setCreateModalOpen(false)}
                  className="px-space-md py-2.5 rounded-full text-cloak-muted hover:text-cloak-text font-headline-sm text-headline-sm font-medium transition-colors cursor-pointer"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-space-lg py-2.5 rounded-full bg-cloak-accent text-cloak-base font-headline-sm text-headline-sm font-semibold shadow-[0_0_16px_rgba(78,222,163,0.3)] hover:bg-cloak-accent-hover transition-all cursor-pointer"
                >
                  Generate Channel Keypair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
