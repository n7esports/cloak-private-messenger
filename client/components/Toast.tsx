"use client";

import { IconClose, IconShieldCheck } from "./icons/UiIcons";

export interface ToastItem {
  id: string;
  message: string;
  icon?: string;
}

interface ToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-2 px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-900/95 px-4 py-3 text-zinc-100 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <IconShieldCheck className="h-5 w-5 flex-shrink-0 text-cloak-accent" />
            <span className="truncate text-sm font-medium text-zinc-100">
              {toast.message}
            </span>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100"
            aria-label="Dismiss toast"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
