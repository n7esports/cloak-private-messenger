"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useVaultStore } from "../store/useVaultStore";

export default function RootPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const openVault = async () => {
      try {
        await useVaultStore.getState().initializeVault();
        if (!active) return;
        router.replace(
          useVaultStore.getState().isUnlocked ? "/chats" : "/lock",
        );
      } catch (cause) {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not open the device vault.",
          );
        }
      }
    };
    void openVault();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="grid min-h-dvh place-items-center bg-cloak-bg px-6 text-center text-zinc-400">
      {error ? (
        <p role="alert" className="max-w-md text-sm text-red-400">
          {error}
        </p>
      ) : (
        <p role="status" className="text-sm">
          Opening your vault…
        </p>
      )}
    </main>
  );
}
