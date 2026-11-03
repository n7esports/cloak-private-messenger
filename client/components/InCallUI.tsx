"use client";

import { useEffect, useState } from "react";
import IconPhone from "./icons/IconPhone";
import IconVideo from "./icons/IconVideo";
import IconX from "./icons/IconX";
import IconMic from "./icons/IconMic";
import { type CallRecord } from "../app/calls/page";

interface InCallUIProps {
  call: CallRecord;
  onEnd: () => void;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function InCallUI({ call, onEnd }: InCallUIProps) {
  const [timer, setTimer] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-on-surface">{call.name}</span>
          <span className="text-xs text-text-secondary">{formatTimer(timer)}</span>
        </div>
        <button onClick={onEnd} className="rounded-lg p-2 text-text-secondary transition hover:bg-surface-high">
          <IconX size={20} />
        </button>
      </div>

      {/* Center */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6">
        <div className="flex h-32 w-32 items-center justify-center rounded-full bg-surface-high">
          <span className="text-3xl font-semibold text-on-surface">
            {call.name.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-base font-semibold text-on-surface">{call.name}</p>
          <p className="text-xs text-text-secondary">E2EE · Connected</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6 px-4 pb-10">
        <button
          onClick={() => setMuted((v) => !v)}
          className={`flex h-14 w-14 items-center justify-center rounded-full border transition ${
            muted ? "border-status-danger bg-status-danger/10 text-status-danger" : "border-hairline bg-surface-container text-on-surface hover:border-primary"
          }`}
          title="Mute"
        >
          <IconMic size={22} />
        </button>
        <button
          onClick={() => setCameraOff((v) => !v)}
          className={`flex h-14 w-14 items-center justify-center rounded-full border transition ${
            cameraOff ? "border-status-danger bg-status-danger/10 text-status-danger" : "border-hairline bg-surface-container text-on-surface hover:border-primary"
          }`}
          title="Camera"
        >
          <IconVideo size={22} />
        </button>
        <button
          onClick={() => setSpeakerOn((v) => !v)}
          className={`flex h-14 w-14 items-center justify-center rounded-full border transition ${
            speakerOn ? "border-primary bg-primary/10 text-primary" : "border-hairline bg-surface-container text-on-surface hover:border-primary"
          }`}
          title="Speaker"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        </button>
        <button
          onClick={onEnd}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-status-danger text-on-primary transition hover:bg-status-danger/90"
          title="End call"
        >
          <IconPhone size={22} className="rotate-[135deg]" />
        </button>
      </div>
    </div>
  );
}
