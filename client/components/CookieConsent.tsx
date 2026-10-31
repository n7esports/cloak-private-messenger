"use client";

import { useState, useEffect } from "react";

type Category = "essential" | "analytics" | "marketing";

const CATEGORIES: { id: Category; label: string; disabled: boolean }[] = [
  { id: "essential", label: "Essential", disabled: true },
  { id: "analytics", label: "Analytics", disabled: false },
  { id: "marketing", label: "Marketing", disabled: false },
];

function postConsent(granted: boolean) {
  console.log("[cookie] postConsent", granted);
  return fetch("/api/consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "cookies", version: "1.0", granted }),
  }).then((res) => {
    console.log("[cookie] /api/consent response", res.status);
    return res;
  });
}

function setConsentCookie() {
  const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `anon_consent=1; expires=${expires}; path=/; SameSite=Lax`;
}

function hasConsentCookie() {
  return document.cookie.split("; ").some((c) => c.startsWith("anon_consent="));
}

export default function CookieConsent() {
  const [open, setOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [toggles, setToggles] = useState<Record<Category, boolean>>({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    setShowBanner(!hasConsentCookie());
  }, []);

  const acceptAll = () => {
    console.log("[cookie] acceptAll clicked");
    setToggles({ essential: true, analytics: true, marketing: true });
    postConsent(true).then(() => {
      setConsentCookie();
      setShowBanner(false);
    });
  };

  const rejectNonEssential = () => {
    console.log("[cookie] rejectNonEssential clicked");
    setToggles({ essential: true, analytics: false, marketing: false });
    postConsent(false).then(() => {
      setConsentCookie();
      setShowBanner(false);
    });
  };

  const savePreferences = () => {
    const granted = toggles.analytics || toggles.marketing;
    console.log("[cookie] savePreferences clicked", granted);
    postConsent(granted).then(() => {
      setConsentCookie();
      setOpen(false);
    });
  };

  const toggle = (id: Category) => {
    setToggles((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!showBanner && !open) return null;

  return (
    <>
      {showBanner && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-hairline bg-surface-container p-4">
          <div className="mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-on-surface">
              This site uses cookies. Essential cookies are always enabled.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={acceptAll}
                className="rounded px-3 py-1.5 text-sm font-medium text-on-primary bg-primary"
              >
                Accept all
              </button>
              <button
                onClick={rejectNonEssential}
                className="rounded px-3 py-1.5 text-sm font-medium border border-hairline text-on-surface"
              >
                Reject non-essential
              </button>
              <button
                onClick={() => setOpen(true)}
                className="rounded px-3 py-1.5 text-sm font-medium border border-hairline text-on-surface"
              >
                Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded border border-hairline bg-surface-container p-6 shadow-panel">
            <h2 className="mb-4 text-base font-medium text-on-surface">
              Cookie Preferences
            </h2>
            <ul className="space-y-3">
              {CATEGORIES.map(({ id, label, disabled }) => (
                <li
                  key={id}
                  className="flex items-center justify-between text-sm text-on-surface"
                >
                  <span>{label}</span>
                  <button
                    role="switch"
                    aria-checked={toggles[id]}
                    disabled={disabled}
                    onClick={() => toggle(id)}
                    className={`h-6 w-10 rounded-full border border-hairline transition-colors ${
                      toggles[id]
                        ? "bg-primary text-on-primary"
                        : "bg-surface-low"
                    } ${disabled ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`block h-4 w-4 rounded-full bg-current transition-transform ${
                        toggles[id] ? "translate-x-4" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded px-3 py-1.5 text-sm font-medium border border-hairline text-on-surface"
              >
                Cancel
              </button>
              <button
                onClick={savePreferences}
                className="rounded px-3 py-1.5 text-sm font-medium text-on-primary bg-primary"
              >
                Save preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
