"use client";

import { useEffect, useState } from "react";
import {
  IconMic,
  IconPhone,
  IconShield,
  IconVideo,
} from "../icons/UiIcons";

export type CallKind = "audio" | "video";

/**
 * Voice/video call surface. WebRTC media transport is not wired up yet, so this
 * presents the call UI honestly (ringing → ended) without pretending a peer
 * connection exists. Signalling can be layered on the existing E2EE channel.
 */
export function CallModal({
  kind,
  peerName,
  onClose,
}: {
  kind: CallKind;
  peerName: string;
  onClose: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const interval = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const minutes = Math.floor(seconds / 60);
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/80 px-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${kind === "video" ? "Video" : "Audio"} call`}
        className="cloak-glass-strong w-full max-w-sm rounded-3xl p-6 text-center"
      >
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-cloak-accent/15 text-cloak-accent">
          {kind === "video" ? (
            <IconVideo className="h-8 w-8" />
          ) : (
            <IconPhone className="h-8 w-8" />
          )}
        </span>
        <h2 className="truncate text-lg font-semibold">{peerName}</h2>
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-cloak-muted">
          <IconShield className="h-3.5 w-3.5 text-cloak-accent" />
          {kind === "video" ? "Video call" : "Audio call"} · {minutes}:{secs}
        </p>
        <p className="mt-4 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs leading-5 text-cloak-muted">
          Media transport is not enabled yet. This is the call interface only —
          the E2EE signalling channel is ready to carry the handshake.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className={`grid h-14 w-14 place-items-center rounded-full transition focus:outline-none focus:ring-2 focus:ring-cloak-accent ${
              muted ? "bg-white/15 text-cloak-text" : "cloak-glass-soft text-cloak-muted"
            }`}
            aria-label={muted ? "Unmute" : "Mute"}
            aria-pressed={muted}
          >
            <IconMic className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid h-14 w-14 place-items-center rounded-full bg-cloak-danger text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-cloak-danger"
            aria-label="End call"
          >
            <IconPhone className="h-6 w-6 rotate-[135deg]" />
          </button>
        </div>
      </section>
    </div>
  );
}
