"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useVaultStore } from "../store/useVaultStore";

export default function RootPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleOpenVault = async () => {
    setError("");
    setLoading(true);
    try {
      await useVaultStore.getState().initializeVault();
      router.replace(
        useVaultStore.getState().isUnlocked ? "/chats" : "/lock",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not open the device vault.",
      );
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-cloak-bg px-6 text-center text-zinc-400">
      <div className="flex flex-col items-center gap-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-16 w-16 text-zinc-500"
          aria-hidden="true"
        >
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-zinc-200">
            Cloak Messenger
          </h1>
          <p className="text-sm text-zinc-500">
            Your private, encrypted messaging vault.
          </p>
        </div>
        {error && (
          <p role="alert" className="max-w-md text-sm text-red-400">
            {error}
          </p>
        )}
        <button
          onClick={handleOpenVault}
          disabled={loading}
          className="rounded-lg bg-zinc-800 px-6 py-2.5 text-sm font-medium text-zinc-100 transition hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Opening…" : "Open Vault"}
        </button>
      </div>
    </main>
  );
}
