"use client";

import { useState } from "react";
import { useVaultStore } from "../store/useVaultStore";
import { useChatStore } from "../store/useChatStore";

export function Providers({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  return (
    <VaultInitializer onReady={() => setIsReady(true)}>
      {isReady ? children : <LoadingShell />}
    </VaultInitializer>
  );
}

function VaultInitializer({
  onReady,
  children,
}: {
  onReady: () => void;
  children: React.ReactNode;
}) {
  const initializeVault = useVaultStore((s) => s.initializeVault);

  useState(() => {
    initializeVault().then(onReady).catch(() => onReady());
  });

  return <>{children}</>;
}

function LoadingShell() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-obsidian">
      <div className="glass-panel flex flex-col items-center gap-3 px-8 py-6">
        <div className="h-2 w-2 rounded-full bg-emerald shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
          Initializing vault
        </p>
      </div>
    </div>
  );
}
