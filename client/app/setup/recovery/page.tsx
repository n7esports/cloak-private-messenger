"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  generateRecoveryPhrase,
  verifyChallengeWords,
  zeroizeUint8Array,
  disposeMnemonic,
  MNEMONIC_CHALLENGE_POSITIONS,
  type RecoveryResult,
} from "@/lib/recovery";

export default function SetupRecoveryPage() {
  const router = useRouter();
  const [recovery, setRecovery] = useState<RecoveryResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const seedRef = useRef<Uint8Array | null>(null);
  const mnemonicRef = useRef<string | null>(null);

  useEffect(() => {
    const result = generateRecoveryPhrase();
    setRecovery(result);
    seedRef.current = result.seed;
    mnemonicRef.current = result.mnemonic;
    return () => {
      if (seedRef.current) {
        zeroizeUint8Array(seedRef.current);
        seedRef.current = null;
      }
      disposeMnemonic(mnemonicRef.current || "");
      mnemonicRef.current = null;
    };
  }, []);

  const handleVerify = () => {
    if (!recovery) return;
    const answerList = MNEMONIC_CHALLENGE_POSITIONS.map((pos) => answers[pos]?.trim() || "");
    if (answerList.some((a) => a.length === 0)) {
      setError("Please fill in all challenge words.");
      return;
    }
    const ok = verifyChallengeWords(
      recovery.mnemonic,
      MNEMONIC_CHALLENGE_POSITIONS,
      answerList,
    );
    if (!ok) {
      setError("One or more words are incorrect. Please try again.");
      return;
    }
    // Store mnemonic for recovery entry. In production, this would be
    // encrypted and persisted server-side or via secure storage.
    if (typeof window !== "undefined") {
      window.localStorage.setItem("UQZERA.recovery.v1", recovery.mnemonic);
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface">
        <div className="bg-surface-container border border-hairline w-full max-w-sm px-8 py-10">
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
            Recovery saved
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Your recovery phrase has been stored. Keep it safe.
          </p>
          <button
            onClick={() => router.replace("/chats")}
            className="mt-6 w-full rounded-xl bg-surface-highest py-3 text-sm font-medium text-outline-variant transition hover:bg-surface-high"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (!recovery) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface">
        <div className="bg-surface-container border border-hairline flex flex-col items-center gap-3 px-8 py-6">
          <div className="h-2 w-2 rounded-full bg-primary" />
          <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
            Generating recovery phrase
          </p>
        </div>
      </div>
    );
  }

  const words = recovery.mnemonic.split(/\s+/);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface">
      <div className="bg-surface-container border border-hairline w-full max-w-lg px-8 py-10">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
          Recovery phrase
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Write down these 24 words in order and keep them somewhere safe.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2 rounded-xl bg-surface-high p-4">
          {words.map((word, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-lg bg-surface-container px-3 py-2"
            >
              <span className="text-xs text-outline">{i + 1}</span>
              <span className="font-mono text-sm text-on-surface">{word}</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-sm text-on-surface-variant">
          Confirm words {MNEMONIC_CHALLENGE_POSITIONS.join(", ")}:
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {MNEMONIC_CHALLENGE_POSITIONS.map((pos) => (
            <div key={pos} className="flex items-center gap-3">
              <span className="w-8 text-right text-xs text-outline">#{pos}</span>
              <input
                type="text"
                value={answers[pos] || ""}
                onChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [pos]: e.target.value }))
                }
                className="flex-1 rounded-xl border border-hairline bg-surface px-4 py-2 text-sm text-on-surface outline-none focus:border-primary"
                autoComplete="off"
              />
            </div>
          ))}
        </div>

        {error && <p className="mt-3 text-sm text-error">{error}</p>}

        <button
          onClick={handleVerify}
          className="mt-6 w-full rounded-xl bg-surface-highest py-3 text-sm font-medium text-outline-variant transition hover:bg-surface-high"
        >
          Verify and save
        </button>
      </div>
    </div>
  );
}
