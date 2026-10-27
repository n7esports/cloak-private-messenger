"use client";

import { useState } from "react";
import { useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";

export function VaultModal() {
  const vaultModalOpen = useChatStore((s) => s.vaultModalOpen);
  const setVaultModalOpen = useChatStore((s) => s.setVaultModalOpen);
  const panicShred = useChatStore((s) => s.panicShred);
  const lockVault = useVaultStore((s) => s.lockVault);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmShred, setConfirmShred] = useState(false);

  if (!vaultModalOpen) return null;

  const handleUnlock = async () => {
    setError(null);
    try {
      await useVaultStore.getState().unlockVault();
      setVaultModalOpen(false);
      setPassphrase("");
    } catch {
      setError("Invalid passphrase.");
    }
  };

  const handleShred = () => {
    if (!confirmShred) {
      setConfirmShred(true);
      return;
    }
    panicShred();
    lockVault();
    setVaultModalOpen(false);
    setConfirmShred(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl shadow-2xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100">Vault</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Enter your passphrase to unlock the vault.
        </p>

        {error && <p className="mt-3 text-sm text-crimson">{error}</p>}

        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Passphrase"
          className="mt-4 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-crimson/60"
          onKeyDown={(e) => e.key === "Enter" && void handleUnlock()}
        />

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => {
              setVaultModalOpen(false);
              setPassphrase("");
              setError(null);
            }}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
          >
            Cancel
          </button>
          <button
            onClick={() => void handleUnlock()}
            className="flex-1 rounded-xl bg-crimson px-4 py-2 text-sm font-medium text-white transition hover:bg-crimson/90"
          >
            Unlock
          </button>
        </div>

        <div className="mt-6 border-t border-zinc-800/60 pt-4">
          <p className="text-xs uppercase tracking-widest text-zinc-500">
            Danger zone
          </p>
          <button
            onClick={handleShred}
            className="mt-2 w-full rounded-xl border border-crimson/40 bg-crimson/10 px-4 py-2 text-sm text-crimson transition hover:bg-crimson/20"
          >
            {confirmShred ? "Click again to shred all data" : "Shred all data"}
          </button>
        </div>
      </div>
    </div>
  );
}
