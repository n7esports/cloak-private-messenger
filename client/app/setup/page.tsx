"use client";

import { AnimatePresence, motion } from "framer-motion";
import { entropyToMnemonic } from "@scure/bip39";
import { wordlist as englishWordlist } from "@scure/bip39/wordlists/english.js";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import TypingDots from "../../components/TypingDots";
import {
  generateIdentity,
  initCrypto,
  type IdentityKeys,
} from "../../lib/crypto";
import { cascade, fadeUp, fadeUpFast, wordCascade } from "../../lib/motion";
import { setFlag } from "../../lib/flags";
import { database, saveEncryptedIdentity } from "../../lib/vault";
import { useVaultStore } from "../../store/useVaultStore";

const strengthLabels = ["Very weak", "Weak", "Fair", "Strong", "Very strong"];
const strengthColors = [
  "bg-cloak-danger",
  "bg-orange-500",
  "bg-yellow-500",
  "bg-cloak-accent",
  "bg-cloak-accent",
];

function chooseRecoveryWords(crypto: Awaited<ReturnType<typeof initCrypto>>) {
  const positions = new Set<number>();
  while (positions.size < 3) {
    positions.add(crypto.randombytes_uniform(24));
  }
  return [...positions].sort((left, right) => left - right);
}

export default function SetupPage() {
  const router = useRouter();
  const unlockVault = useVaultStore((state) => state.unlockVault);
  const [identity, setIdentity] = useState<IdentityKeys | null>(null);
  const identityRef = useRef<IdentityKeys | null>(null);
  const [recoveryPhrase, setRecoveryPhrase] = useState("");
  const [challengePositions, setChallengePositions] = useState<number[]>([]);
  const [passphrase, setPassphrase] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [strength, setStrength] = useState(0);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [step, setStep] = useState<
    "welcome" | "credentials" | "recovery"
  >("welcome");
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [acknowledgedPhrase, setAcknowledgedPhrase] = useState(false);
  const [error, setError] = useState("");
  const [visibleBotPrompt, setVisibleBotPrompt] = useState<
    "welcome" | "credentials" | "recovery" | null
  >(null);

  useEffect(() => {
    let active = true;
    const prepareVault = async () => {
      const existingVault = await database.vault.get("primary");
      if (!active) return;
      if (existingVault) {
        await setFlag("cloak_onboarded", true);
        await useVaultStore.getState().restoreSession();
        router.replace(
          useVaultStore.getState().isUnlocked ? "/chats" : "/unlock",
        );
        return;
      }
      const crypto = await initCrypto();
      const keys = await generateIdentity();
      const entropy = crypto.randombytes_buf(32);
      const phrase = entropyToMnemonic(entropy, englishWordlist);
      entropy.fill(0);
      if (!active) {
        keys.signingPrivateKey.fill(0);
        keys.encryptionPrivateKey.fill(0);
        keys.signingPublicKey.fill(0);
        keys.encryptionPublicKey.fill(0);
        return;
      }
      identityRef.current = keys;
      setIdentity(keys);
      setRecoveryPhrase(phrase);
      setChallengePositions(chooseRecoveryWords(crypto));
      setIsReady(true);
    };

    prepareVault().catch((cause: unknown) => {
      if (active) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not initialize cryptographic services.",
        );
      }
    });
    return () => {
      active = false;
      const currentIdentity = identityRef.current;
      if (currentIdentity) {
        currentIdentity.signingPrivateKey.fill(0);
        currentIdentity.encryptionPrivateKey.fill(0);
        currentIdentity.signingPublicKey.fill(0);
        currentIdentity.encryptionPublicKey.fill(0);
        identityRef.current = null;
      }
    };
  }, [router]);

  useEffect(() => {
    setVisibleBotPrompt(null);
    const timeout = window.setTimeout(
      () => setVisibleBotPrompt(step),
      800,
    );
    return () => window.clearTimeout(timeout);
  }, [step]);

  useEffect(() => {
    if (step !== "credentials") return;
    let active = true;
    const timeout = window.setTimeout(() => {
      import("zxcvbn")
        .then(({ default: estimateStrength }) => {
          if (active) setStrength(estimateStrength(passphrase).score);
        })
        .catch((cause: unknown) => {
          if (active) {
            setError(
              cause instanceof Error
                ? `Passphrase strength could not be checked: ${cause.message}`
                : "Passphrase strength could not be checked.",
            );
          }
        });
    }, 150);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [passphrase, step]);

  const phraseWords = recoveryPhrase.split(" ");
  const challengeMatches = challengePositions.every(
    (position, index) =>
      answers[index].trim().toLowerCase() === phraseWords[position],
  );

  function continueToRecovery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (passphrase.length < 12) {
      setError("Your passphrase must be at least 12 characters.");
      return;
    }
    if (passphrase !== confirmation) {
      setError("The passphrases do not match.");
      return;
    }
    setStep("recovery");
  }

  async function completeSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!identity) {
      setError("Identity keys are not ready. Reload this page and try again.");
      return;
    }
    if (!challengeMatches) {
      setError("Those words do not match the recovery phrase.");
      return;
    }
    if (!acknowledgedPhrase) {
      setError("Confirm that you have safely stored the recovery phrase.");
      return;
    }

    setIsSaving(true);
    try {
      await saveEncryptedIdentity(passphrase, recoveryPhrase, identity);
      await setFlag("cloak_onboarded", true);
      await unlockVault(passphrase);
      identity.signingPrivateKey.fill(0);
      identity.encryptionPrivateKey.fill(0);
      identity.signingPublicKey.fill(0);
      identity.encryptionPublicKey.fill(0);
      identityRef.current = null;
      setIdentity(null);
      setPassphrase("");
      setConfirmation("");
      setRecoveryPhrase("");
      router.replace("/chats/welcome");
    } catch (cause: unknown) {
      setError(
        cause instanceof Error ? cause.message : "Vault setup could not be saved.",
      );
      setIsSaving(false);
    }
  }

  return (
    <main className="cloak-app-screen flex items-center justify-center overflow-y-auto bg-cloak-base px-5 py-10 font-sans text-cloak-text">
      <section
        aria-labelledby="setup-heading"
        className="w-full max-w-2xl rounded-2xl border border-cloak-border bg-cloak-surface-1 p-5 shadow-2xl sm:p-8"
      >
        <div className="mb-8 flex items-center gap-3">
          <div
            aria-hidden="true"
            className="grid h-11 w-11 place-items-center rounded-xl bg-cloak-accent/10 text-xl text-cloak-accent"
          >
            ◈
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cloak-accent">
              Cloak private messenger
            </p>
            <h1 id="setup-heading" className="mt-1 text-xl font-semibold">
              Set up your private vault
            </h1>
          </div>
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={cascade(0, 0.15)}
          className="mb-6 space-y-3"
        >
          {visibleBotPrompt === "welcome" || step !== "welcome" ? (
            <motion.p
              variants={fadeUp}
              className="max-w-xl rounded-2xl rounded-tl-sm border border-cloak-border bg-cloak-base px-4 py-3 text-sm leading-6 text-cloak-muted"
            >
              Welcome to Cloak. There are no accounts, phone numbers, or
              plaintext message servers. Your identity and messages belong to
              this device.
            </motion.p>
          ) : (
            <TypingDots />
          )}
          {step !== "welcome" && (
            <motion.p
              variants={fadeUp}
              className="ml-auto max-w-xl rounded-2xl rounded-tr-sm bg-cloak-accent/10 px-4 py-3 text-sm leading-6 text-cloak-text"
            >
              {step === "credentials"
                ? "I’m ready to protect this device with a passphrase."
                : "I’ve saved my recovery phrase and am confirming it."}
            </motion.p>
          )}
        </motion.div>

        {!isReady && !error && (
          <p role="status" className="text-sm text-cloak-muted">
            Generating your device identity…
          </p>
        )}

        <AnimatePresence mode="wait">
          {step === "welcome" ? (
            <motion.div
              key="welcome"
              variants={fadeUpFast}
              initial="hidden"
              animate="show"
              exit="exit"
              className="space-y-5"
            >
              {error && (
                <p role="alert" className="text-sm text-cloak-danger">
                  {error}
                </p>
              )}
              <button
                type="button"
                disabled={!isReady}
                onClick={() => setStep("credentials")}
                className="min-h-12 w-full rounded-lg bg-cloak-accent px-4 py-3 font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent focus:ring-offset-2 focus:ring-offset-cloak-surface-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isReady ? "Let’s create your vault" : "Preparing this device…"}
              </button>
            </motion.div>
          ) : step === "credentials" ? (
            <motion.form
              key="credentials"
              variants={fadeUpFast}
              initial="hidden"
              animate="show"
              exit="exit"
              onSubmit={continueToRecovery}
              className="space-y-6"
            >
              {visibleBotPrompt === "credentials" ? (
                <p className="rounded-2xl rounded-tl-sm border border-cloak-border bg-cloak-base px-4 py-3 text-sm leading-6 text-cloak-muted">
                  First, choose a strong passphrase. Your keys are generated
                  here and protected with Argon2id before being saved to the
                  vault.
                </p>
              ) : (
                <TypingDots />
              )}
              <div>
                <label
                  htmlFor="vault-passphrase"
                  className="mb-2 block text-sm font-medium"
                >
                  Vault passphrase
                </label>
                <input
                  id="vault-passphrase"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={passphrase}
                  onChange={(event) => setPassphrase(event.target.value)}
                  className="w-full rounded-lg border border-cloak-border bg-cloak-base px-4 py-3 text-cloak-text outline-none transition focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
                  aria-describedby="passphrase-strength passphrase-requirement"
                />
                <p
                  id="passphrase-requirement"
                  className="mt-2 text-xs text-cloak-muted"
                >
                  Use at least 12 characters. This passphrase cannot be
                  recovered by Cloak.
                </p>
                <div
                  id="passphrase-strength"
                  className="mt-3"
                  role="meter"
                  aria-label="Passphrase strength"
                  aria-valuemin={0}
                  aria-valuemax={4}
                  aria-valuenow={strength}
                  aria-valuetext={strengthLabels[strength]}
                >
                  <div className="h-1.5 overflow-hidden rounded-full bg-cloak-surface-2">
                    <div
                      className={`h-full transition-all ${strengthColors[strength]}`}
                      style={{ width: `${((strength + 1) / 5) * 100}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-cloak-muted">
                    Strength: {strengthLabels[strength]}
                  </p>
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirm-passphrase"
                  className="mb-2 block text-sm font-medium"
                >
                  Confirm passphrase
                </label>
                <input
                  id="confirm-passphrase"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="w-full rounded-lg border border-cloak-border bg-cloak-base px-4 py-3 text-cloak-text outline-none transition focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-cloak-danger">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={!isReady}
                className="min-h-12 w-full rounded-lg bg-cloak-accent px-4 py-3 font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent focus:ring-offset-2 focus:ring-offset-cloak-surface-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to recovery phrase
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="recovery"
              variants={fadeUpFast}
              initial="hidden"
              animate="show"
              exit="exit"
              onSubmit={completeSetup}
              className="space-y-6"
            >
              {visibleBotPrompt === "recovery" ? (
                <div>
                  <h2 className="text-lg font-semibold">
                    Save your recovery phrase
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-cloak-muted">
                    Write these 24 words down and keep them somewhere safe and
                    offline. They can unlock your encrypted identity if you
                    forget your passphrase.
                  </p>
                </div>
              ) : (
                <TypingDots />
              )}
              <ol
                aria-label="24-word recovery phrase"
                className="grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {phraseWords.map((word, index) => (
                  <li key={`${index}-${word}`}>
                    <motion.div
                      variants={wordCascade(index)}
                      initial="hidden"
                      animate="show"
                      className="flex min-h-11 items-center gap-2 rounded-md border border-cloak-border bg-cloak-base px-3 py-2 font-mono text-sm"
                    >
                      <span className="w-5 text-right text-xs text-cloak-muted">
                        {index + 1}
                      </span>
                      <span>{word}</span>
                    </motion.div>
                  </li>
                ))}
              </ol>
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-medium">
                  Confirm these words to continue
                </legend>
                {challengePositions.map((position, index) => (
                  <div
                    key={position}
                    className="grid grid-cols-[auto_1fr] items-center gap-3"
                  >
                    <label
                      htmlFor={`recovery-word-${index}`}
                      className="text-sm text-cloak-muted"
                    >
                      Word {position + 1}
                    </label>
                    <input
                      id={`recovery-word-${index}`}
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      required
                      value={answers[index]}
                      onChange={(event) =>
                        setAnswers((current) =>
                          current.map((answer, answerIndex) =>
                            answerIndex === index ? event.target.value : answer,
                          ),
                        )
                      }
                      className="rounded-lg border border-cloak-border bg-cloak-base px-4 py-2.5 text-cloak-text outline-none focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
                    />
                  </div>
                ))}
              </fieldset>
              <label className="flex items-start gap-3 rounded-lg border border-cloak-border bg-cloak-base p-3 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={acknowledgedPhrase}
                  onChange={(event) =>
                    setAcknowledgedPhrase(event.target.checked)
                  }
                  className="mt-1 h-4 w-4 accent-cloak-accent"
                  required
                />
                <span>
                  I have written down and safely stored all 24 recovery words.
                  I understand Cloak cannot recover them for me.
                </span>
              </label>
              {error && (
                <p role="alert" className="text-sm text-cloak-danger">
                  {error}
                </p>
              )}
              <div className="flex flex-col-reverse gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setStep("credentials")}
                  disabled={isSaving}
                  className="min-h-12 flex-1 rounded-lg border border-cloak-border px-4 py-3 font-medium text-cloak-text transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:opacity-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!challengeMatches || !acknowledgedPhrase || isSaving}
                  className="min-h-12 flex-1 rounded-lg bg-cloak-accent px-4 py-3 font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent focus:ring-offset-2 focus:ring-offset-cloak-surface-1 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSaving ? "Encrypting vault…" : "Create vault"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
