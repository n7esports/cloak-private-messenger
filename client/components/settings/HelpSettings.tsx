"use client";

export default function HelpSettings() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
        <h2 className="text-sm font-semibold text-on-surface">Help</h2>
        <p className="mt-1 text-xs text-outline">Get support and learn more about UQZERA.</p>
        <div className="mt-3 flex flex-col gap-2">
          <a href="/legal/terms" className="rounded-xl border border-outline-variant bg-surface-container/60 px-4 py-2 text-xs text-on-surface-variant hover:text-text-primary transition text-center">
            Terms of Service
          </a>
          <a href="/legal/privacy" className="rounded-xl border border-outline-variant bg-surface-container/60 px-4 py-2 text-xs text-on-surface-variant hover:text-text-primary transition text-center">
            Privacy Policy
          </a>
          <a href="/legal/security" className="rounded-xl border border-outline-variant bg-surface-container/60 px-4 py-2 text-xs text-on-surface-variant hover:text-text-primary transition text-center">
            Security
          </a>
        </div>
      </div>
    </div>
  );
}
