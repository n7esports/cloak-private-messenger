"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useVaultStore } from "../../store/useVaultStore";
import { encodeBytes } from "../../lib/protocol";
import { generateIdentity } from "../../lib/crypto";
import {
  clearLocalVaultKey,
  getOrCreateLocalVaultKey,
  saveIdentityWithVaultKey,
  wipeVaultDatabase,
} from "../../lib/vault";
import IconKey from "../icons/IconKey";
import IconCopy from "../icons/IconCopy";

const ALIAS_STORAGE_KEY = "cloak.identity.alias";

export function MyIdentityModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const identity = useVaultStore((s) => s.identity);
  const lockVault = useVaultStore((s) => s.lockVault);

  const publicKey = useMemo(() => {
    if (!identity) return "";
    return encodeBytes(identity.encryptionPublicKey);
  }, [identity]);

  // QR payload rotates on a 5-minute timer so the canvas re-renders with a
  // fresh timestamp. shortcut: visible QR doesn't change, only the embedded ts.
  const [alias, setAlias] = useState("");
  const [savedAlias, setSavedAlias] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmChangeKey, setConfirmChangeKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const stored = localStorage.getItem(ALIAS_STORAGE_KEY);
      setSavedAlias(stored || "");
      setAlias(stored || "");
    }
  }, [open]);

  const handleCopy = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleSaveAlias = () => {
    const trimmed = alias.trim();
    localStorage.setItem(ALIAS_STORAGE_KEY, trimmed);
    setSavedAlias(trimmed);
  };

  const handleChangeKey = useCallback(async () => {
    if (!confirmChangeKey) {
      setConfirmChangeKey(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await wipeVaultDatabase();
      const vaultKey = await getOrCreateLocalVaultKey();
      const newIdentity = await generateIdentity();
      await saveIdentityWithVaultKey(newIdentity, vaultKey);
      useVaultStore.setState({ identity: newIdentity, vaultKey });
      localStorage.removeItem(ALIAS_STORAGE_KEY);
      setSavedAlias("");
      setAlias("");
      setConfirmChangeKey(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not regenerate identity.");
    } finally {
      setBusy(false);
    }
  }, [confirmChangeKey]);

  const handleSignOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // Continue local sign-out even if the network is unavailable.
    }
    try {
      await wipeVaultDatabase();
    } catch {
      // best-effort wipe; continue to lock regardless
    }
    lockVault();
    router.push("/lock");
  }, [lockVault, router]);

  const deviceInfo = useMemo(() => {
    if (typeof navigator === "undefined") return "Unavailable";
    return navigator.userAgent;
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-surface-container border border-hairline rounded-2xl p-6 shadow-panel">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-on-surface">Identity</h2>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-on-surface-variant transition hover:bg-surface-high hover:text-on-surface"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="mt-1 text-xs font-medium tracking-wider text-on-surface-variant uppercase">
            AUDIT BOT • E2EE BOT LINK
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Device info */}
          <div>
            <p className="mb-1 text-xs font-medium text-on-surface-variant">Device</p>
            <p className="text-xs text-on-surface break-all">{deviceInfo}</p>
          </div>

          {/* Public key with copy */}
          {publicKey && (
            <div>
              <p className="mb-1 text-xs font-medium text-on-surface-variant">PUBLIC KEY • X25519</p>
              <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface px-3 py-2">
                <code className="flex-1 truncate font-mono text-xs text-on-surface break-all">
                  {publicKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="rounded-lg p-1.5 text-primary transition hover:bg-surface-high"
                  title="Copy public key"
                >
                  <IconCopy size={16} />
                </button>
              </div>
              {copied && (
                <p className="mt-1 text-xs text-primary">Copied to clipboard.</p>
              )}
            </div>
          )}

          {/* Session fingerprint */}
          {publicKey && (
            <div>
              <p className="mb-1 text-xs font-medium text-on-surface-variant">SESSION FINGERPRINT • SHA-256</p>
              <div className="rounded-xl border border-hairline bg-surface px-3 py-2">
                <code className="font-mono text-xs text-on-surface break-all">
                  {publicKey.slice(0, 32).match(/.{1,8}/g)?.join(" ") || publicKey.slice(0, 32)}
                </code>
              </div>
            </div>
          )}

          {/* Alias edit */}
          <div>
            <p className="mb-1 text-xs font-medium text-on-surface-variant">Alias</p>
            <div className="flex items-center gap-2">
              <input
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder="Your display name"
                className="flex-1 rounded-xl border border-hairline bg-surface-container px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant outline-none focus:border-primary"
              />
              <button
                onClick={handleSaveAlias}
                className="rounded-xl bg-primary px-4 py-2 text-xs font-medium text-on-primary transition hover:bg-primary/90"
              >
                Save
              </button>
            </div>
            {savedAlias && (
              <p className="mt-1 text-xs text-on-surface-variant">Saved as &ldquo;{savedAlias}&rdquo;</p>
            )}
          </div>

          {/* Change Key */}
          <div className="flex flex-col gap-2">
            {!confirmChangeKey ? (
              <button
                onClick={handleChangeKey}
                disabled={busy}
                className="rounded-xl border border-outline-variant bg-surface-container px-4 py-2.5 text-xs font-medium text-on-surface-variant transition hover:border-outline-variant hover:text-on-surface disabled:opacity-50"
              >
                Change Key
              </button>
            ) : (
              <div className="rounded-xl border border-error/40 bg-error/10 p-3">
                <p className="text-xs text-error">
                  This will permanently destroy your current identity and all encrypted data. This cannot be undone.
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleChangeKey}
                    disabled={busy}
                    className="flex-1 rounded-lg bg-error px-3 py-1.5 text-xs font-medium text-on-error transition hover:bg-error/90 disabled:opacity-50"
                  >
                    {busy ? "Regenerating…" : "Regenerate identity"}
                  </button>
                  <button
                    onClick={() => setConfirmChangeKey(false)}
                    disabled={busy}
                    className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-xs font-medium text-on-surface-variant transition hover:text-on-surface disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {error && <p className="text-xs text-error">{error}</p>}
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="rounded-xl border border-outline-variant bg-surface-container px-4 py-2.5 text-xs font-medium text-on-surface-variant transition hover:border-outline-variant hover:text-on-surface"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
