"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultStore } from "../../store/useVaultStore";
import { useChatStore } from "../../store/useChatStore";
import { startChatServices } from "../../store/useChatStore";

export default function LockPage() {
  const router = useRouter();
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const sessionRestored = useVaultStore((state) => state.sessionRestored);
  const sessionRestoreError = useVaultStore((state) => state.sessionRestoreError);
  const unlockVault = useVaultStore((state) => state.unlockVault);

  useEffect(() => {
    if (sessionRestored && isUnlocked) {
      startChatServices();
      router.replace("/chats");
    }
  }, [sessionRestored, isUnlocked, router]);

  if (!sessionRestored) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-obsidian">
        <div className="glass-panel flex flex-col items-center gap-3 px-8 py-6">
          <div className="h-2 w-2 rounded-full bg-emerald shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Restoring session
          </p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-obsidian">
        <div className="glass-panel w-full max-w-sm px-8 py-10">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-zinc-100">
            Cloak
          </h1>
          <p className="mt-2 text-sm text-zinc-400">Enter your passcode to unlock.</p>
          {sessionRestoreError && (
            <p className="mt-2 text-sm text-crimson">{sessionRestoreError}</p>
          )}
          <button
            onClick={() => unlockVault()}
            className="mt-6 w-full rounded-xl bg-zinc-100 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return null;
}
