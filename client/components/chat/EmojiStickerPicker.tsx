"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const EMOJI = [
  "😀", "😂", "🥰", "😎", "🤝", "👍", "🙏", "🔥",
  "🎉", "✅", "❤️", "💜", "😅", "🤔", "👀", "😴",
  "🚀", "💡", "📎", "🔒", "🛡️", "✨", "🌟", "⚡",
  "😭", "😡", "🤯", "🥳", "🙌", "👏", "💬", "📌",
];

const STICKERS = [
  "🫡", "🤌", "🫶", "🧠", "🕵️", "🗿", "🐐", "🦾",
  "🔐", "🧨", "🌊", "🍀", "☕", "🎯", "🎧", "📡",
];

/** Emoji and sticker picker in a single tabbed panel. */
export function EmojiStickerPicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (value: string) => void;
}) {
  const [tab, setTab] = useState<"emoji" | "stickers">("emoji");
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const onPointer = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const items = tab === "emoji" ? EMOJI : STICKERS;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Emoji and stickers"
      className="cloak-glass-strong fixed bottom-24 left-3 z-[95] w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-2 shadow-2xl"
    >
      <div className="mb-2 flex gap-1 rounded-xl p-0.5">
        {(["emoji", "stickers"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={`min-h-9 flex-1 rounded-lg text-xs font-medium capitalize transition focus:outline-none focus:ring-2 focus:ring-cloak-accent ${
              tab === value
                ? "bg-cloak-accent/15 text-cloak-accent"
                : "text-cloak-muted hover:text-cloak-text"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPick(item)}
            className="grid h-9 w-9 place-items-center rounded-lg text-lg transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            aria-label={`Insert ${item}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>,
    document.body,
  );
}
