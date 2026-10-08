"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { fadeUpFast } from "../../lib/motion";
import { database, wipeVaultDatabase } from "../../lib/vault";
import { useVaultStore } from "../../store/useVaultStore";

export default function UnlockPage() {
  const router = useRouter();
  const unlockVault = useVaultStore((state) => state.unlockVault);
  const unlockWithRecoveryPhrase = useVaultStore(
    (state) => state.unlockWithRecoveryPhrase,
  );
  const clearMemoryKeys = useVaultStore((state) => state.clearMemoryKeys);
  const restoreSession = useVaultStore((state) => state.restoreSession);
  const sessionRestoreError = useVaultStore(
    (state) => state.sessionRestoreError,
  );
  const [mode, setMode] = useState<"passphrase" | "recovery">("passphrase");
  const [credential, setCredential] = useState("");
  const [hasVault, setHasVault] = useState<boolean | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const prepareUnlock = async () => {
      try {
        await restoreSession();
        if (!active) return;
        if (useVaultStore.getState().isUnlocked) {
          router.replace("/chats");
          return;
        }
        const record = await database.vault.get("primary");
        if (!active) return;
        if (!record) {
          router.replace("/setup");
          return;
        }
        setHasVault(true);
      } catch (cause: unknown) {
        if (active) {
          setHasVault(false);
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not access the encrypted vault.",
          );
        }
      }
    };
    void prepareUnlock();
    return () => {
      active = false;
    };
  }, [restoreSession, router]);

  async function submitUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsBusy(true);
    try {
      if (mode === "passphrase") {
        await unlockVault(credential);
      } else {
        await unlockWithRecoveryPhrase(credential);
      }
      setCredential("");
      router.replace("/chats");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The vault could not be unlocked.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function panicWipe() {
    if (
      !window.confirm(
        "Permanently erase the encrypted Cloak vault on this device?",
      )
    ) {
      return;
    }
    setError("");
    setIsBusy(true);
    try {
      clearMemoryKeys();
      await wipeVaultDatabase();
      try {
        window.localStorage.removeItem("has_completed_onboarding");
      } catch {
        // The IndexedDB onboarding flag is removed with the vault database.
      }
      router.replace("/setup");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The vault could not be erased from this device.",
      );
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <main className="cloak-app-screen flex items-center justify-center overflow-y-auto bg-cloak-base px-5 py-10 font-sans text-cloak-text">
      <section
        aria-labelledby="unlock-heading"
        className="w-full max-w-md rounded-2xl border border-cloak-border bg-cloak-surface-1 p-6 shadow-2xl sm:p-9"
      >
        <div className="mb-8 text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-cloak-accent/30 bg-cloak-accent/10 text-2xl text-cloak-accent"
          >
            ◈
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cloak-accent">
            Cloak private messenger
          </p>
          <h1 id="unlock-heading" className="mt-2 text-2xl font-semibold">
            Unlock your vault
          </h1>
          <p className="mt-2 text-sm text-cloak-muted">
            Your keys stay encrypted until you unlock on this device.
          </p>
        </div>

        {hasVault === null && !error && (
          <p role="status" className="text-center text-sm text-cloak-muted">
            Checking encrypted vault…
          </p>
        )}
        {hasVault && (
          <AnimatePresence mode="wait">
            <motion.form
              key={mode}
              variants={fadeUpFast}
              initial="hidden"
              animate="show"
              exit="exit"
              onSubmit={submitUnlock}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="vault-credential"
                  className="mb-2 block text-sm font-medium"
                >
                  {mode === "passphrase" ? "Passphrase" : "24-word recovery phrase"}
                </label>
                {mode === "passphrase" ? (
                  <input
                    id="vault-credential"
                    type="password"
                    autoComplete="current-password"
                    required
                    autoFocus
                    value={credential}
                    onChange={(event) => setCredential(event.target.value)}
                    className="w-full rounded-lg border border-cloak-border bg-cloak-base px-4 py-3 text-cloak-text outline-none transition focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
                  />
                ) : (
                  <textarea
                    id="vault-credential"
                    rows={4}
                    autoComplete="off"
                    spellCheck={false}
                    required
                    autoFocus
                    value={credential}
                    onChange={(event) => setCredential(event.target.value)}
                    className="w-full resize-y rounded-lg border border-cloak-border bg-cloak-base px-4 py-3 font-mono text-sm text-cloak-text outline-none transition focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
                  />
                )}
              </div>
              {error && (
                <p role="alert" className="text-sm text-cloak-danger">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={isBusy || !credential.trim()}
                className="min-h-12 w-full rounded-lg bg-cloak-accent px-4 py-3 font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent focus:ring-offset-2 focus:ring-offset-cloak-surface-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBusy ? "Unlocking…" : "Unlock vault"}
              </button>
            </motion.form>
          </AnimatePresence>
        )}
        {sessionRestoreError && (
          <p role="status" className="mt-4 text-sm text-cloak-muted">
            {sessionRestoreError} Enter your passphrase to unlock.
          </p>
        )}

        <div className="mt-6 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setCredential("");
              setError("");
              setMode((current) =>
                current === "passphrase" ? "recovery" : "passphrase",
              );
            }}
            className="min-h-11 px-3 text-sm text-cloak-muted underline decoration-cloak-border underline-offset-4 transition hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            {mode === "passphrase" ? "Use recovery phrase" : "Use passphrase"}
          </button>
          <button
            type="button"
            onClick={panicWipe}
            disabled={isBusy || hasVault === null}
            className="min-h-11 px-3 text-sm font-medium text-cloak-danger transition hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-cloak-danger disabled:cursor-not-allowed disabled:opacity-50"
          >
            Panic Wipe
          </button>
        </div>
      </section>
    </main>
  );
}
