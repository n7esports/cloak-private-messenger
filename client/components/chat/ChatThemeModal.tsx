"use client";

import { IconPaint } from "../icons/UiIcons";
import { Sheet, SheetBody, SheetHeader } from "./Sheet";

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
    <Sheet open onClose={onClose} variant="center" label="Chat theme">
      <SheetHeader
        title="Chat theme"
        onClose={onClose}
        icon={<IconPaint className="h-4 w-4 shrink-0 text-cloak-accent" />}
      />
      <SheetBody className="p-5 pt-4">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
      </SheetBody>
    </Sheet>
  );
}
