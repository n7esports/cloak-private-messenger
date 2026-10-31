"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultStore } from "../../store/useVaultStore";
import { verifyPasscode, recordFailedPasscodeAttempt, clearFailedPasscodeAttempts } from "../../src/lib/security";

export default function LockPage() {
  const router = useRouter();
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const sessionRestored = useVaultStore((state) => state.sessionRestored);
  const sessionRestoreError = useVaultStore((state) => state.sessionRestoreError);
  const unlockVault = useVaultStore((state) => state.unlockVault);
  const lockVault = useVaultStore((state) => state.lockVault);

  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isUnlocked) {
      router.replace("/chats");
    }
  }, [isUnlocked, router]);

  // Lockout timer
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = () => {
      const remaining = Math.max(0, lockedUntil - Date.now());
      if (!remaining) setLockedUntil(0);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [lockedUntil]);

  const remainingLockoutSecs = lockedUntil > 0 ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || lockedUntil > 0) return;
    setError(null);

    if (!/^\d{6}$/.test(passcode)) {
      setError("Enter your 6-digit passcode.");
      return;
    }

    setBusy(true);
    try {
      const result = await verifyPasscode(passcode);
      if (result === "primary" || result === "decoy") {
        await clearFailedPasscodeAttempts();
        await unlockVault();
        return;
      }
      const failureState = await recordFailedPasscodeAttempt();
      setPasscode("");
      if (failureState.lockedUntil > Date.now()) {
        setLockedUntil(failureState.lockedUntil);
        setError(`Too many attempts. Try again in ${Math.ceil((failureState.lockedUntil - Date.now()) / 1000)} seconds.`);
      } else {
        setError("Incorrect passcode.");
      }
    } catch (verifyError) {
      setError(verifyError instanceof Error ? verifyError.message : "Passcode verification failed.");
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    lockVault();
    setPasscode("");
    setError(null);
    setLockedUntil(0);
    inputRef.current?.focus();
  }

  if (!sessionRestored) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-base">
        <div className="bg-panel border border-default flex flex-col items-center gap-3 px-8 py-6">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <p className="font-mono text-xs uppercase tracking-widest text-secondary">Restoring session</p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-base">
        <div className="bg-panel border border-default w-full max-w-sm px-8 py-10">
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-primary">UQZERA</h1>
          <p className="mt-2 text-sm text-secondary">Enter your 6-digit passcode to unlock.</p>
          {sessionRestoreError && (
            <p className="mt-2 text-sm text-error">{sessionRestoreError}</p>
          )}
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="sr-only">Passcode</span>
              <input
                aria-label="Passcode"
                autoComplete="off"
                className="h-14 w-full rounded-xl border border-default bg-input text-center font-mono text-2xl tracking-[0.5em] text-primary outline-none focus:border-default focus:ring-2 focus:ring-accent-emerald/20"
                disabled={busy || lockedUntil > 0}
                inputMode="numeric"
                maxLength={6}
                onChange={(event) => setPasscode(event.target.value.replace(/\D/g, ""))}
                pattern="[0-9]*"
                ref={inputRef}
                type="password"
                value={passcode}
              />
            </label>
            {lockedUntil > 0 && (
              <p aria-live="polite" className="text-center text-sm text-error">
                Locked for {remainingLockoutSecs} seconds.
              </p>
            )}
            {error && (
              <p aria-live="polite" role="alert" className="text-center text-sm text-error">{error}</p>
            )}
            <button
              type="submit"
              disabled={busy || lockedUntil > 0}
              className="h-12 w-full rounded-xl accent-emerald py-3 text-sm font-medium transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
            >
              {busy ? "Checking…" : "Unlock"}
            </button>
          </form>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-3 w-full rounded-xl border border-default bg-panel px-4 py-2 text-xs text-secondary transition hover:text-primary"
          >
            Lock Vault
          </button>
        </div>
      </div>
    );
  }

  return null;
}
