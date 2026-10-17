"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type SheetVariant = "bottom" | "center" | "right";

/**
 * Shared overlay primitive for every sheet / drawer / modal in the chat UI.
 *
 * Why a primitive: `position: fixed` is only viewport-relative when no ancestor
 * establishes a containing block. Ancestors here use `backdrop-filter` (the
 * glass surfaces) and `overflow: hidden`, both of which break that assumption,
 * so every overlay is portaled to <body> instead of rendered in place.
 *
 * Bounds: the panel is a flex child capped at `max-h-full` of a full-viewport
 * container, so it can never grow past the screen. Safe-area insets are applied
 * to the container (top) and panel (bottom) so notches, punch-holes and gesture
 * bars never overlap content.
 */
export function Sheet({
  open,
  onClose,
  variant = "bottom",
  label,
  className = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  variant?: SheetVariant;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const position =
    variant === "bottom"
      ? "items-end justify-center"
      : variant === "right"
        ? "items-stretch justify-end"
        : "items-center justify-center p-4";

  const panel =
    variant === "bottom"
      ? "w-full max-w-lg rounded-t-3xl pb-[max(env(safe-area-inset-bottom),0.75rem)]"
      : variant === "right"
        ? "h-full w-[min(24rem,100vw)]"
        : "w-full max-w-md rounded-2xl";

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex pt-[env(safe-area-inset-top)] ${position}`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/60"
        style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={`cloak-glass-strong relative flex max-h-full min-h-0 flex-col overflow-hidden shadow-2xl ${panel} ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/** Non-scrolling header row. */
export function SheetHeader({
  title,
  onClose,
  leading,
  icon,
}: {
  title: string;
  onClose: () => void;
  leading?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 px-4 pt-4">
      {leading}
      {icon}
      <h2 className="min-w-0 flex-1 truncate text-sm font-semibold">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
        aria-label={`Close ${title}`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  );
}

/** Scrolling body. `min-h-0` is what actually lets it shrink and scroll. */
export function SheetBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`cloak-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${className}`}
    >
      {children}
    </div>
  );
}
