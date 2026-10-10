"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PasscodeModal from "../../src/components/PasscodeModal";
import { wipeVaultDatabase } from "../../lib/vault";
import { hasPasscodes, setPasscodes, verifyPasscode } from "../../src/lib/security";
import { useVaultStore } from "../../store/useVaultStore";

export default function LockPage() {
  const router = useRouter();
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);

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
          setConfigured(false);
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
    await useVaultStore.getState().unlockVault();
    if (!useVaultStore.getState().isUnlocked) {
      throw new Error("The device vault could not be opened.");
    }
    router.replace("/chats");
  }

  async function handleSetup(primaryPasscode: string, decoyPasscode: string) {
    await setPasscodes(primaryPasscode, decoyPasscode);
    await unlockAfterPasscode();
  }

  async function handleVerify(passcode: string) {
    const result = await verifyPasscode(passcode);
    if (result === "primary" || result === "decoy") {
      await unlockAfterPasscode();
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
    setError("");
    setIsBusy(true);
    try {
      useVaultStore.getState().clearMemoryKeys();
      await wipeVaultDatabase();
      router.replace("/chats");
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

  if (configured === null && !error) {
    return (
      <main className="grid min-h-dvh place-items-center bg-cloak-bg px-6 text-cloak-text">
        <p role="status" className="text-sm text-cloak-muted">
          Checking your vault…
        </p>
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
        onClick={panicWipe}
        disabled={isBusy}
        aria-label="Permanently erase this device's encrypted vault"
        className="fixed bottom-4 left-1/2 z-[110] min-h-11 -translate-x-1/2 rounded-lg px-3 text-sm font-medium text-rose-300 transition hover:text-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Erase this device&apos;s vault
      </button>
    </>
  );
}
