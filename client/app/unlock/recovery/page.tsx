"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { validateRecoveryPhrase, disposeMnemonic } from "@/lib/recovery";

export default function UnlockRecoveryPage() {
  const router = useRouter();
  const [phrase, setPhrase] = useState("");
  const phraseRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleVerify = () => {
    setError(null);
    const normalized = phrase.trim().replace(/\s+/g, " ");
    if (normalized.length === 0) {
      setError("Please enter your recovery phrase.");
      return;
    }
    // SECURITY FIX (F-14 follow-up): the recovery phrase is entered by the
    // user here and validated against the BIP-39 checksum locally. It is
    // NEVER read from or written to localStorage — the setup flow no longer
    // persists it anywhere. The transient copy is released immediately after
    // validation.
    phraseRef.current = normalized;
    const ok = validateRecoveryPhrase(phraseRef.current);
    disposeMnemonic(phraseRef.current);
    phraseRef.current = null;
    if (!ok) {
      setError("That recovery phrase is not valid. Check for typos or missing words.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-base">
        <div className="bg-panel border border-default w-full max-w-sm px-8 py-10">
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-primary">
            Verified
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Recovery phrase confirmed. Your encrypted vault stays on this
            device; nothing about this phrase was stored in the browser.
          </p>
          <button
            onClick={() => router.replace("/lock")}
            className="mt-6 w-full rounded-xl accent-emerald py-3 text-sm font-medium transition hover:opacity-90"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-base">
      <div className="bg-panel border border-default w-full max-w-sm px-8 py-10">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-primary">
          Recovery
        </h1>
        <p className="mt-2 text-sm text-secondary">
          Enter the full 24-word recovery phrase you wrote down during setup.
          We only check its checksum locally — the phrase never leaves this
          device and is not stored anywhere.
        </p>

        <textarea
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          rows={5}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          placeholder="word word word …"
          className="mt-6 w-full rounded-xl border border-default bg-input px-4 py-3 font-mono text-sm text-primary outline-none focus:border-default"
        />

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <button
          onClick={handleVerify}
          className="mt-6 w-full rounded-xl accent-emerald py-3 text-sm font-medium transition hover:opacity-90"
        >
          Verify
        </button>

        <p className="mt-4 text-center text-xs text-secondary">
          Lost your phrase?{" "}
          <Link href="/setup/recovery" className="text-accent-emerald hover:underline">
            Generate a new one
          </Link>
        </p>
      </div>
    </div>
  );
}
