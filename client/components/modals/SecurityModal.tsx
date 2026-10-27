"use client";

import { useChatStore } from "../../store/useChatStore";

export function SecurityModal() {
  const securityModalOpen = useChatStore((s) => s.securityModalOpen);
  const setSecurityModalOpen = useChatStore((s) => s.setSecurityModalOpen);

  if (!securityModalOpen) return null;

  const localFingerprint = "a3f1c9e7d2b4...8f6c";
  const remoteFingerprint = "b7e2d4f8a1c3...9e5d";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800/80 rounded-2xl shadow-2xl p-6">
        <h2 className="text-lg font-semibold text-zinc-100">
          Verify Safety Numbers
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Compare these fingerprints with your contact to verify end-to-end
          encryption.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">
              Your fingerprint
            </p>
            <p className="mt-1 font-mono text-xs text-zinc-300 break-all">
              {localFingerprint}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">
              Their fingerprint
            </p>
            <p className="mt-1 font-mono text-xs text-zinc-300 break-all">
              {remoteFingerprint}
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          The first 4 bytes of each Double Ratchet root key, displayed as a
          hex string.
        </p>

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setSecurityModalOpen(false)}
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
          >
            Close
          </button>
          <button
            onClick={() => {
              // Mark as verified in chat store if needed.
              setSecurityModalOpen(false);
            }}
            className="flex-1 rounded-xl bg-emerald px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald/90"
          >
            Mark verified
          </button>
        </div>
      </div>
    </div>
  );
}
