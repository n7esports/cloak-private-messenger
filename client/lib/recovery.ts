import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeedSync,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";

export type RecoveryResult = {
  mnemonic: string;
  seed: Uint8Array;
};

export function generateRecoveryPhrase(): RecoveryResult {
  const mnemonic = generateMnemonic(wordlist, 256);
  const seed = mnemonicToSeedSync(mnemonic);
  return { mnemonic, seed };
}

export function validateRecoveryPhrase(mnemonic: string): boolean {
  return validateMnemonic(mnemonic, wordlist);
}

export function verifyChallengeWords(
  mnemonic: string,
  positions: readonly number[],
  answers: string[],
): boolean {
  const words = mnemonic.trim().split(/\s+/);
  return positions.every((pos, i) => {
    const idx = pos - 1;
    return words[idx] === answers[i]?.trim();
  });
}

export function zeroizeUint8Array(buffer: Uint8Array): void {
  buffer.fill(0);
}

export function disposeMnemonic(mnemonic: string): void {
  // Strings are immutable in JS. Any sensitive material derived from the
  // mnemonic must live in Uint8Arrays and be zeroized explicitly. The string
  // itself is released by removing references (React state cleanup, nulling vars).
}

export const MNEMONIC_CHALLENGE_POSITIONS = [3, 11, 19] as const;
export const MNEMONIC_WORD_COUNT = 24;
