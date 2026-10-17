"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import PasscodeModal from "../../src/components/PasscodeModal";
import { wipeVaultDatabase } from "../../lib/vault";
import {
  hasPasscodes,
  setPasscodes,
  triggerDecoyWipe,
  verifyPasscode,
} from "../../src/lib/security";
import { useVaultStore } from "../../store/useVaultStore";

export default function LockPage() {
  const router = useRouter();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const isWipeInProgress = useRef(false);

  useEffect(() => {
    let active = true;
    const prepare = async () => {
      try {
        await useVaultStore.getState().initializeVault();
        if (!active) return;
        if (useVaultStore.getState().isUnlocked) {
          router.replace("/chats");
          return;
        }
        setConfigured(await hasPasscodes());
      } catch (cause: unknown) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not read the passcode configuration.",
          );
        }
      }
    };
    void prepare();
    return () => {
      active = false;
    };
  }, [router]);

  async function unlockAfterPasscode() {
    try {
      await useVaultStore.getState().unlockVault();
      if (!useVaultStore.getState().isUnlocked) {
        throw new Error("The device vault could not be opened.");
      }
      router.replace("/chats");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The device vault could not be opened.",
      );
    }
  }

  async function handleSetup(primaryPasscode: string, decoyPasscode: string) {
    await setPasscodes(primaryPasscode, decoyPasscode);
    await unlockAfterPasscode();
  }

  async function wipeVault(): Promise<void> {
    if (isWipeInProgress.current) {
      throw new Error("A vault wipe is already in progress.");
    }
    isWipeInProgress.current = true;
    setIsBusy(true);
    setError("");
    try {
      useVaultStore.getState().clearMemoryKeys();
      const errors: unknown[] = [];
      try {
        await wipeVaultDatabase();
      } catch (cause) {
        errors.push(cause);
      }
      try {
        await triggerDecoyWipe();
      } catch (cause) {
        errors.push(cause);
      }
      if (errors.length) {
        throw new AggregateError(errors, "The vault could not be completely erased.");
      }
      setConfigured(false);
    } finally {
      isWipeInProgress.current = false;
      setIsBusy(false);
    }
  }

  async function handleVerify(passcode: string) {
    const result = await verifyPasscode(passcode);
    if (result === "primary") {
      await unlockAfterPasscode();
      return result;
    }
    if (result === "decoy") {
      if (
        !window.confirm(
          "The decoy passcode was entered. Permanently erase the encrypted Cloak vault on this device?",
        )
      ) {
        return null;
      }
      // A decoy unlock must NEVER open the real vault. Wipe everything —
      // identity, chats, notes, and the passcode config itself — so the
      // device looks like a fresh install to whoever entered the decoy. The
      // app then lands in the passcode-setup flow, indistinguishable from
      // first launch.
      await wipeVault();
      return result;
    }
    return result;
  }

  async function panicWipe() {
    if (
      !window.confirm(
        "Permanently erase the encrypted Cloak vault on this device?",
      )
    ) {
      return;
    }
    if (isWipeInProgress.current) return;
    try {
      await wipeVault();
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The vault could not be erased from this device.",
      );
    }
  }

  async function retryVaultOpen() {
    setError("");
    try {
      await useVaultStore.getState().initializeVault();
      if (useVaultStore.getState().isUnlocked) {
        router.replace("/chats");
        return;
      }
      setConfigured(await hasPasscodes());
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not open the device vault.",
      );
    }
  }

  async function recoverVault() {
    if (
      !window.confirm(
        "This permanently erases the damaged vault and its passcodes so you can create a new vault. Continue?",
      )
    ) {
      return;
    }
    try {
      await wipeVault();
      setError("");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The damaged vault could not be erased from this device.",
      );
    }
  }

  if (configured === null) {
    return (
      <main className="grid min-h-dvh place-items-center bg-cloak-bg px-6 text-cloak-text">
        <div className="max-w-lg text-center">
          {error ? (
            <>
              <p role="alert" className="text-sm leading-6 text-cloak-danger">
                {error}
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void retryVaultOpen()}
                  disabled={isBusy}
                  className="min-h-11 rounded-lg border border-cloak-border px-4 text-sm disabled:opacity-50"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => void recoverVault()}
                  disabled={isBusy}
                  className="min-h-11 rounded-lg bg-cloak-danger px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Erase vault and re-key
                </button>
              </div>
            </>
          ) : (
            <p role="status" className="text-sm text-cloak-muted">
              Checking your vault…
            </p>
          )}
        </div>
      </main>
    );
  }

  return (
    <>
      <PasscodeModal
        configured={configured ?? false}
        error={error}
        onSetup={handleSetup}
        onVerify={handleVerify}
      />
      <button
        type="button"
        onClick={() => void panicWipe()}
        disabled={isBusy}
        aria-label="Permanently erase this device's encrypted vault"
        className="fixed bottom-4 left-1/2 z-[110] min-h-11 -translate-x-1/2 rounded-lg px-3 text-sm font-medium text-rose-300 transition hover:text-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Erase this device&apos;s vault
      </button>
    </>
  );
}
