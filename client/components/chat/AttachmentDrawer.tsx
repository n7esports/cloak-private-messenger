"use client";

import { useRef } from "react";
import {
  IconCamera,
  IconClose,
  IconFile,
  IconImage,
  IconLocation,
  IconMic,
} from "../icons/UiIcons";

export type AttachmentKind = "photos" | "camera" | "documents" | "audio" | "location";

const OPTIONS: {
  id: AttachmentKind;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  accept?: string;
  tone: string;
}[] = [
  {
    id: "photos",
    label: "Photos & videos",
    hint: "From your gallery",
    icon: IconImage,
    accept: "image/*,video/*",
    tone: "bg-sky-500/15 text-sky-300",
  },
  {
    id: "camera",
    label: "Camera",
    hint: "Take a photo",
    icon: IconCamera,
    accept: "image/*",
    tone: "bg-rose-500/15 text-rose-300",
  },
  {
    id: "documents",
    label: "Documents",
    hint: "PDF, docs, archives",
    icon: IconFile,
    accept: ".pdf,.txt,.md,.csv,.json,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx",
    tone: "bg-violet-500/15 text-violet-300",
  },
  {
    id: "audio",
    label: "Audio",
    hint: "Sound files",
    icon: IconMic,
    accept: "audio/*",
    tone: "bg-amber-500/15 text-amber-300",
  },
  {
    id: "location",
    label: "Location",
    hint: "Share where you are",
    icon: IconLocation,
    tone: "bg-emerald-500/15 text-emerald-300",
  },
];

export function AttachmentDrawer({
  open,
  onClose,
  onPickFile,
  onLocation,
}: {
  open: boolean;
  onClose: () => void;
  onPickFile: (file: File) => void;
  onLocation: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingKindRef = useRef<AttachmentKind>("documents");

  if (!open) return null;

  function choose(kind: AttachmentKind) {
    if (kind === "location") {
      onLocation();
      onClose();
      return;
    }
    pendingKindRef.current = kind;
    if (inputRef.current) {
      const option = OPTIONS.find((entry) => entry.id === kind);
      inputRef.current.accept = option?.accept ?? "*/*";
      if (kind === "camera") inputRef.current.setAttribute("capture", "environment");
      else inputRef.current.removeAttribute("capture");
      inputRef.current.click();
    }
  }

  return (
    <div className="fixed inset-0 z-[95] flex items-end md:items-center md:justify-center">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
        style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Attach"
        className="cloak-glass-strong relative w-full rounded-t-3xl p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl md:w-[26rem] md:rounded-2xl md:pb-4"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20 md:hidden" />
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Attach</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            aria-label="Close attach menu"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2 md:grid-cols-1">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => choose(option.id)}
                className="flex min-h-14 items-center gap-3 rounded-xl px-3 text-left transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${option.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {option.label}
                  </span>
                  <span className="block truncate text-xs text-cloak-muted">
                    {option.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 rounded-xl border border-cloak-accent/25 bg-cloak-accent/5 px-3 py-2 text-[11px] leading-5 text-cloak-muted">
          Attachments are encrypted on this device before sending — the relay
          only ever sees ciphertext.
        </p>

        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onPickFile(file);
            event.currentTarget.value = "";
            onClose();
          }}
        />
      </section>
    </div>
  );
}
