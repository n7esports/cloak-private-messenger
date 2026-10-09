"use client";

import { IconClose, IconPaint } from "../icons/UiIcons";

export const CHAT_THEMES = [
  { id: "default", label: "Cloak Green", accent: "bg-emerald-500", bg: "" },
  { id: "ocean", label: "Ocean", accent: "bg-sky-500", bg: "bg-sky-950/20" },
  { id: "violet", label: "Violet", accent: "bg-violet-500", bg: "bg-violet-950/20" },
  { id: "amber", label: "Amber", accent: "bg-amber-500", bg: "bg-amber-950/10" },
  { id: "rose", label: "Rose", accent: "bg-rose-500", bg: "bg-rose-950/20" },
  { id: "slate", label: "Slate", accent: "bg-slate-400", bg: "bg-slate-900/40" },
] as const;

/** Chat theme / wallpaper picker. Applies a tinted background to the thread. */
export function ChatThemeModal({
  current,
  onSelect,
  onClose,
}: {
  current: string;
  onSelect: (themeId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 px-5">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Chat theme"
        className="cloak-glass-strong w-full max-w-md overflow-hidden rounded-2xl p-5"
      >
        <div className="flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-sm font-semibold">
            <IconPaint className="h-4 w-4 text-cloak-accent" />
            Chat theme
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            aria-label="Close theme picker"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CHAT_THEMES.map((theme) => {
            const active = current === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => onSelect(theme.id)}
                aria-pressed={active}
                className={`flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border p-3 transition focus:outline-none focus:ring-2 focus:ring-cloak-accent ${
                  active
                    ? "border-cloak-accent bg-cloak-accent/10"
                    : "border-white/10 hover:bg-white/5"
                }`}
              >
                <span className={`h-7 w-7 rounded-full ${theme.accent}`} />
                <span className="truncate text-xs">{theme.label}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-[11px] leading-5 text-cloak-muted">
          Themes tint the conversation background on this device only. They are
          stored in your encrypted chat record.
        </p>
      </section>
    </div>
  );
}
