"use client";

import { useState, useEffect, useCallback } from "react";
import { useChatStore } from "../store/useChatStore";
import {
  IconMic,
  IconPhone,
  IconShield,
  IconVideo,
  IconLock,
} from "./icons/UiIcons";

interface CallModalProps {
  isOpen: boolean;
  callType: "audio" | "video";
  onClose: () => void;
  contactName?: string;
}

export function CallModal({
  isOpen,
  callType,
  onClose,
  contactName = "Elena Vance",
}: CallModalProps) {
  const [seconds, setSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const { showToast } = useChatStore();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (isOpen) {
      setSeconds(0);
      timer = setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen]);

  const formatTime = useCallback((secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      showToast({
        id: crypto.randomUUID(),
        message: next ? "Microphone muted" : "Microphone unmuted",
        icon: next ? "mic_off" : "mic",
      });
      return next;
    });
  }, [showToast]);

  const toggleVideo = useCallback(() => {
    setIsVideoOff((prev) => {
      const next = !prev;
      showToast({
        id: crypto.randomUUID(),
        message: next ? "Encrypted camera feed paused" : "Camera stream active",
        icon: next ? "videocam_off" : "videocam",
      });
      return next;
    });
  }, [showToast]);

  const handleEndCall = useCallback(() => {
    onClose();
    showToast({
      id: crypto.randomUUID(),
      message: "Call terminated. Ephemeral audio buffer shredded.",
      icon: "call_end",
    });
  }, [onClose, showToast]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/90 backdrop-blur-2xl animate-in fade-in duration-200">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-surface-container-low rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-surface-container-high/60"
      >
        {/* Top Status Bar */}
        <div className="p-space-md bg-surface-container/60 flex items-center justify-between border-b border-surface-container-high/40">
          <div className="flex items-center gap-space-xs">
            <IconLock width={18} height={18} className="text-primary" />
            <span className="font-label-code-sm text-label-code-sm text-on-surface font-mono">
              E2EE P2P CALL • DTLS-SRTP (OPUS 48kHz)
            </span>
          </div>
          <span className="font-label-code-sm text-label-code-sm text-primary font-mono font-bold tracking-wider">
            {formatTime(seconds)}
          </span>
        </div>

        {/* Video / Visualizer Stage */}
        <div className="relative w-full h-80 sm:h-96 bg-surface-container-lowest flex items-center justify-center overflow-hidden">
          {callType === "video" && !isVideoOff ? (
            <div className="relative w-full h-full">
              <div className="w-full h-full bg-gradient-to-br from-surface-container-high to-surface-container-lowest flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-surface-container-highest to-surface-bright flex items-center justify-center ring-4 ring-primary/30 shadow-2xl">
                    <IconVideo width={40} height={40} className="text-primary" />
                  </div>
                  <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                    {contactName}
                  </span>
                  <span className="font-label-code-sm text-label-code-sm text-primary font-mono">
                    Encrypted Video Stream
                  </span>
                </div>
              </div>
              {/* Picture-in-picture self feed */}
              <div className="absolute bottom-4 right-4 w-28 h-36 rounded-2xl bg-surface-container-high/90 overflow-hidden border border-primary/40 shadow-xl flex items-center justify-center">
                <IconVideo width={24} height={24} className="text-on-surface-variant" />
                <span className="absolute bottom-1 left-2 text-[10px] font-mono text-primary bg-black/60 px-1 rounded">
                  YOU
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-space-md">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-surface-container-highest to-surface-bright flex items-center justify-center ring-4 ring-primary/30 shadow-2xl">
                  <IconPhone width={36} height={36} className="text-primary" />
                </div>
                <span className="absolute bottom-0 right-1 w-4 h-4 rounded-full bg-primary ring-2 ring-surface" />
              </div>

              <div className="flex flex-col items-center">
                <span className="font-headline-md text-headline-md text-on-surface font-semibold">
                  {contactName}
                </span>
                <span className="font-label-code-sm text-label-code-sm text-primary font-mono mt-0.5">
                  Direct Onion Stream Active
                </span>
              </div>

              {/* Animated audio visualizer bars */}
              <div className="flex items-center gap-1.5 h-8">
                {[5, 8, 6, 7, 4, 8, 6, 5].map((h, i) => (
                  <div
                    key={i}
                    className="w-1 bg-primary rounded-full animate-bounce"
                    style={{
                      height: `${h * 4}px`,
                      animationDelay: `${i * 75}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Peer connection badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 rounded-full bg-surface-container-lowest/80 backdrop-blur-md border border-surface-container-high/40 text-on-surface font-label-code-sm text-label-code-sm font-mono">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span>0% PACKET LOSS • JITTER: 2ms</span>
          </div>
        </div>

        {/* Bottom Call Controls */}
        <div className="p-space-lg bg-surface-container flex items-center justify-center gap-space-md border-t border-surface-container-high/40">
          <button
            onClick={toggleMute}
            className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
              isMuted
                ? "bg-error-container text-on-error-container"
                : "bg-surface-container-high text-on-surface hover:bg-surface-bright"
            }`}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            <IconMic width={24} height={24} />
          </button>

          {callType === "video" && (
            <button
              onClick={toggleVideo}
              className={`p-3.5 rounded-2xl transition-all cursor-pointer ${
                isVideoOff
                  ? "bg-error-container text-on-error-container"
                  : "bg-surface-container-high text-on-surface hover:bg-surface-bright"
              }`}
              title={isVideoOff ? "Enable camera" : "Disable camera"}
            >
              <IconVideo width={24} height={24} />
            </button>
          )}

          <button
            onClick={() =>
              showToast({
                id: crypto.randomUUID(),
                message: "Audio output switched to Encrypted Bluetooth Sink",
                icon: "volume_up",
              })
            }
            className="p-3.5 rounded-2xl bg-surface-container-high text-on-surface hover:bg-surface-bright transition-all cursor-pointer"
            title="Audio Source"
          >
            <IconShield width={24} height={24} />
          </button>

          <button
            onClick={handleEndCall}
            className="p-3.5 rounded-2xl bg-error text-on-error hover:bg-error-container hover:text-on-error-container transition-all cursor-pointer shadow-lg active:scale-95"
            title="End Call"
          >
            <IconPhone width={24} height={24} className="rotate-[135deg]" />
          </button>
        </div>
      </div>
    </div>
  );
}
