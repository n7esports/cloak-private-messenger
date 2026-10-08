"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { startChatServices, useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";

export default function ChatsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const loadChats = useChatStore((state) => state.loadChats);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isUnlocked) {
      router.replace("/unlock");
      return undefined;
    }

    let active = true;
    let stopTransport: (() => void) | undefined;
    loadChats()
      .then(() => {
        if (active) stopTransport = startChatServices();
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load encrypted conversations.",
          );
        }
      });
    return () => {
      active = false;
      stopTransport?.();
    };
  }, [isUnlocked, loadChats, router]);

  if (!isUnlocked) return null;
  if (error) {
    return (
      <main className="cloak-app-screen grid place-items-center bg-cloak-base px-6 text-cloak-text">
        <p role="alert" className="max-w-lg text-center text-sm text-cloak-danger">
          {error}
        </p>
      </main>
    );
  }
  return children;
}
