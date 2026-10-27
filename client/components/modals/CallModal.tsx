"use client";

import { useState } from "react";
import { useChatStore } from "../../store/useChatStore";

export function CallModal() {
  const callModalState = useChatStore((s) => s.callModalState);
  const setCallModalState = useChatStore((s) => s.setCallModalState);

  if (callModalState === "closed") return null;

  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl shadow-2xl p-6 text-center">
        <h2 className="text-lg font-semibold text-zinc-100">
          {callModalState === "incoming"
            ? "Incoming call"
            : callModalState === "outgoing"
              ? "Calling..."
              : "Active call"}
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          {callModalState === "incoming"
            ? "Someone is calling you"
            : callModalState === "outgoing"
              ? "Ringing..."
              : "Connected"}
        </p>

        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => setMuted((v) => !v)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              muted
                ? "border-crimson bg-crimson/20 text-crimson"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            {muted ? "Unmute" : "Mute"}
          </button>
          <button
            onClick={() => setCameraOn((v) => !v)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              cameraOn
                ? "border-crimson bg-crimson/20 text-crimson"
                : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-700"
            }`}
          >
            {cameraOn ? "Stop camera" : "Start camera"}
          </button>
        </div>

        <button
          onClick={() => setCallModalState("closed")}
          className="mt-6 w-full rounded-xl bg-crimson px-4 py-2 text-sm font-medium text-white transition hover:bg-crimson/90"
        >
          End call
        </button>
      </div>
    </div>
  );
}
