"use client";

import { useState } from "react";
import { IconBell, IconBellOff } from "./icons/UiIcons";

type PermissionState = "idle" | "granted" | "denied" | "unsupported" | "error";

/**
 * A compact, dismissible prompt that asks the browser for notification
 * permission. It is never auto-triggered — the user opts in with one click,
 * which keeps the E2EE app free of surprise permission prompts.
 */
export function NotificationPrompt({ className = "" }: { className?: string }) {
  const [state, setState] = useState<PermissionState>(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "unsupported";
    }
    if (Notification.permission === "granted") return "granted";
    if (Notification.permission === "denied") return "denied";
    return "idle";
  });
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (state === "granted" || dismissed) return null;

  async function enable() {
    setBusy(true);
    try {
      const { requestNotificationPermission } = await import(
        "../src/lib/notifications.js"
      );
      const result = await requestNotificationPermission();
      if (result?.status === "granted") setState("granted");
      else if (result?.status === "denied") setState("denied");
      else if (result?.status === "unsupported") setState("unsupported");
      else setState("error");
    } catch {
      setState("error");
    } finally {
      setBusy(false);
    }
  }

  const message =
    state === "denied"
      ? "Notifications are blocked in your browser settings."
      : state === "unsupported"
        ? "This browser does not support notifications."
        : state === "error"
          ? "Could not enable notifications."
          : "Get notified about new messages when Cloak is in the background.";

  return (
    <div
      className={`cloak-glass-soft flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-cloak-muted ${className}`}
    >
      {state === "denied" || state === "unsupported" ? (
        <IconBellOff className="h-4 w-4 shrink-0 text-cloak-dim" />
      ) : (
        <IconBell className="h-4 w-4 shrink-0 text-cloak-accent" />
      )}
      <span className="min-w-0 flex-1 leading-5">{message}</span>
      {state === "idle" && (
        <button
          type="button"
          onClick={() => void enable()}
          disabled={busy}
          className="min-h-8 shrink-0 rounded-lg bg-cloak-accent px-2.5 text-[11px] font-semibold text-cloak-base transition hover:bg-cloak-accent-hover disabled:opacity-50"
        >
          {busy ? "…" : "Enable"}
        </button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded-md px-1.5 text-cloak-dim transition hover:text-cloak-muted"
        aria-label="Dismiss notification prompt"
      >
        ✕
      </button>
    </div>
  );
}
