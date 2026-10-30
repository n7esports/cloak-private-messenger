"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  verifyChallengeWords,
  disposeMnemonic,
  MNEMONIC_CHALLENGE_POSITIONS,
} from "@/lib/recovery";

export default function UnlockRecoveryPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const storedRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      storedRef.current = window.localStorage.getItem("cloak.recovery.v1");
    }
    return () => {
      disposeMnemonic(storedRef.current || "");
      storedRef.current = null;
    };
  }, []);

  const handleVerify = () => {
    const mnemonic = storedRef.current;
    if (!mnemonic) {
      setError("No recovery phrase found. Please set one up first.");
      return;
    }
    const answerList = MNEMONIC_CHALLENGE_POSITIONS.map((pos) => answers[pos]?.trim() || "");
    if (answerList.some((a) => a.length === 0)) {
      setError("Please fill in all challenge words.");
      return;
    }
    const ok = verifyChallengeWords(mnemonic, MNEMONIC_CHALLENGE_POSITIONS, answerList);
    if (!ok) {
      setError("One or more words are incorrect. Please try again.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-surface">
        <div className="bg-surface-container border border-hairline w-full max-w-sm px-8 py-10">
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
            Verified
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Recovery phrase confirmed.
          </p>
          <button
            onClick={() => router.replace("/lock")}
            className="mt-6 w-full rounded-xl bg-surface-highest py-3 text-sm font-medium text-outline-variant transition hover:bg-surface-high"
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-surface">
      <div className="bg-surface-container border border-hairline w-full max-w-sm px-8 py-10">
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-on-surface">
          Recovery
        </h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Enter words {MNEMONIC_CHALLENGE_POSITIONS.join(", ")} from your recovery phrase.
        </p>

        <div className="mt-6 flex flex-col gap-3">
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
          Verify
        </button>
      </div>
    </div>
  );
}
