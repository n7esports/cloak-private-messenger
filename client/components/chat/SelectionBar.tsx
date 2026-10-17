"use client";

import { IconClose, IconCopy, IconTrash } from "../icons/UiIcons";

export function SelectionBar({
  count,
  onCopy,
  onDelete,
  onCancel,
}: {
  count: number;
  onCopy: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="cloak-glass-strong flex items-center gap-2 rounded-2xl px-3 py-2">
      <button
        type="button"
        onClick={onCancel}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
        aria-label="Cancel selection"
      >
        <IconClose className="h-5 w-5" />
      </button>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">
        {count} selected
      </p>
      <button
        type="button"
        onClick={onCopy}
        disabled={count === 0}
        className="grid h-11 w-11 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:opacity-40"
        aria-label="Copy selected messages"
        title="Copy"
      >
        <IconCopy className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={count === 0}
        className="grid h-11 w-11 place-items-center rounded-xl text-cloak-danger transition hover:bg-cloak-danger/10 focus:outline-none focus:ring-2 focus:ring-cloak-danger disabled:opacity-40"
        aria-label="Delete selected messages"
        title="Delete"
      >
        <IconTrash className="h-5 w-5" />
      </button>
    </div>
  );
}
