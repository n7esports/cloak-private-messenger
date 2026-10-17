"use client";

import { useMemo } from "react";
import { useChatStore } from "../store/useChatStore";
import {
  IconClose,
  IconShieldCheck,
  IconCheck,
} from "./icons/UiIcons";

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  contactName?: string;
  fingerprint?: string;
  safetyNumbers?: string;
}

export function SecurityModal({
  isOpen,
  onClose,
  onConfirm,
  contactName = "Elena Vance",
  safetyNumbers = "71049   33819   00291   88401\n49182   77319   54201   99182",
}: SecurityModalProps) {
  const { chats } = useChatStore();

  const activeContact = useMemo(
    () => chats.find((c) => c.kind === "direct" && c.alias === contactName),
    [chats, contactName]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-container-lowest/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-surface-container-low p-space-lg rounded-3xl shadow-2xl flex flex-col gap-space-md border border-surface-container-high/50 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs">
            <IconShieldCheck width={24} height={24} className="text-primary" />
            <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
              Security Verification
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <IconClose width={20} height={20} />
          </button>
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
          Verify {contactName}&apos;s cryptographic safety numbers by comparing with her
          physical device or scanning the visual identity block below.
        </p>

        {/* Safety Number Representation QR placeholder & fingerprint block */}
        <div className="p-space-md bg-surface-container rounded-2xl flex flex-col items-center gap-space-sm text-center border border-surface-container-high/40">
          <div className="w-40 h-40 bg-surface-container-lowest rounded-xl p-3 flex items-center justify-center shadow-inner">
            <svg
              className="w-full h-full text-primary"
              fill="currentColor"
              viewBox="0 0 100 100"
            >
              <rect
                fill="none"
                height="25"
                rx="3"
                stroke="currentColor"
                strokeWidth="6"
                width="25"
                x="10"
                y="10"
              />
              <rect fill="currentColor" height="11" width="11" x="17" y="17" />
              <rect
                fill="none"
                height="25"
                rx="3"
                stroke="currentColor"
                strokeWidth="6"
                width="25"
                x="65"
                y="10"
              />
              <rect fill="currentColor" height="11" width="11" x="72" y="17" />
              <rect
                fill="none"
                height="25"
                rx="3"
                stroke="currentColor"
                strokeWidth="6"
                width="25"
                x="10"
                y="65"
              />
              <rect fill="currentColor" height="11" width="11" x="17" y="72" />
              <rect height="6" width="6" x="42" y="12" />
              <rect height="6" width="6" x="52" y="12" />
              <rect height="16" rx="2" width="16" x="42" y="42" />
              <rect height="8" width="8" x="65" y="42" />
              <rect height="8" width="8" x="42" y="68" />
              <rect height="12" width="12" x="78" y="72" />
            </svg>
          </div>

          <div className="font-label-code-md text-label-code-md tracking-wider text-on-surface select-all bg-surface-container-high px-3 py-2.5 rounded-xl w-full font-mono leading-relaxed border border-surface-container-highest/50">
            {safetyNumbers.split("\n").map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-on-surface-variant font-label-code-sm text-label-code-sm">
          <span className="font-mono">Session State: ACTIVE</span>
          <span className="text-primary font-mono font-semibold">
            E2EE CONFIRMED
          </span>
        </div>

        <button
          onClick={onConfirm}
          className="w-full py-3 rounded-2xl bg-primary text-on-primary font-body-md text-body-md font-semibold shadow-lg hover:bg-primary-container transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
        >
          <IconCheck width={18} height={18} />
          Mark Safety Number as Verified
        </button>
      </div>
    </div>
  );
}
