"use client";

import { create } from "zustand";
import { initCrypto, type IdentityKeys } from "../lib/crypto";
import {
  decryptStoredIdentity,
  database,
  type VaultRecord,
} from "../lib/vault";

const SESSION_CACHE_KEY = "cloak-active-vault-session";

interface VaultState {
  isUnlocked: boolean;
  sessionRestored: boolean;
  sessionRestoreError: string | null;
  vaultKey: Uint8Array | null;
  identity: IdentityKeys | null;
  restoreSession: () => Promise<void>;
  unlockVault: (passphrase: string) => Promise<void>;
  unlockWithRecoveryPhrase: (phrase: string) => Promise<void>;
  lockVault: () => void;
  clearMemoryKeys: () => void;
}

let unlockGeneration = 0;
const memoryKeyCleanups = new Set<() => void>();

interface CachedVaultSession {
  version: 1;
  vaultKey: string;
  identity: {
    signingPublicKey: string;
    signingPrivateKey: string;
    encryptionPublicKey: string;
    encryptionPrivateKey: string;
  };
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("Cached vault session contains invalid key material.");
  }
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function clearSessionCache(): void {
  if (typeof window !== "undefined") {
    window.sessionStorage.removeItem(SESSION_CACHE_KEY);
  }
}

function cacheSession(vaultKey: Uint8Array, identity: IdentityKeys): void {
  if (typeof window === "undefined") return;
  const cached: CachedVaultSession = {
    version: 1,
    vaultKey: bytesToBase64(vaultKey),
    identity: {
      signingPublicKey: bytesToBase64(identity.signingPublicKey),
      signingPrivateKey: bytesToBase64(identity.signingPrivateKey),
      encryptionPublicKey: bytesToBase64(identity.encryptionPublicKey),
      encryptionPrivateKey: bytesToBase64(identity.encryptionPrivateKey),
    },
  };
  window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cached));
}

function parseCachedSession(value: unknown): CachedVaultSession {
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 1 ||
    !("vaultKey" in value) ||
    typeof value.vaultKey !== "string" ||
    !("identity" in value) ||
    typeof value.identity !== "object" ||
    value.identity === null
  ) {
    throw new Error("Cached vault session has an invalid format.");
  }
  const identity = value.identity;
  if (
    !("signingPublicKey" in identity) ||
    typeof identity.signingPublicKey !== "string" ||
    !("signingPrivateKey" in identity) ||
    typeof identity.signingPrivateKey !== "string" ||
    !("encryptionPublicKey" in identity) ||
    typeof identity.encryptionPublicKey !== "string" ||
    !("encryptionPrivateKey" in identity) ||
    typeof identity.encryptionPrivateKey !== "string"
  ) {
    throw new Error("Cached vault identity has an invalid format.");
  }
  return {
    version: 1,
    vaultKey: value.vaultKey,
    identity: {
      signingPublicKey: identity.signingPublicKey,
      signingPrivateKey: identity.signingPrivateKey,
      encryptionPublicKey: identity.encryptionPublicKey,
      encryptionPrivateKey: identity.encryptionPrivateKey,
    },
  };
}

function clearKeys(state: Pick<VaultState, "vaultKey" | "identity">): void {
  clearSessionCache();
  state.vaultKey?.fill(0);
  state.identity?.signingPrivateKey.fill(0);
  state.identity?.encryptionPrivateKey.fill(0);
  state.identity?.signingPublicKey.fill(0);
  state.identity?.encryptionPublicKey.fill(0);
  for (const cleanup of memoryKeyCleanups) cleanup();
}

export function registerMemoryKeyCleanup(cleanup: () => void): () => void {
  memoryKeyCleanups.add(cleanup);
  return () => memoryKeyCleanups.delete(cleanup);
}

async function hydrateVault(
  passphrase: string,
  useRecoveryPhrase = false,
): Promise<void> {
  useVaultStore.getState().lockVault();
  const request = ++unlockGeneration;
  const record: VaultRecord | undefined = await database.vault.get("primary");
  if (!record) {
    throw new Error("No vault is configured on this device.");
  }

  const { identity, vaultKey } = await decryptStoredIdentity(
    record,
    passphrase,
    useRecoveryPhrase,
  );
  if (request !== unlockGeneration) {
    vaultKey.fill(0);
    identity.signingPrivateKey.fill(0);
    identity.encryptionPrivateKey.fill(0);
    identity.signingPublicKey.fill(0);
    identity.encryptionPublicKey.fill(0);
    throw new Error("Vault unlock was canceled.");
  }

  useVaultStore.setState({
    isUnlocked: true,
    sessionRestored: true,
    sessionRestoreError: null,
    vaultKey,
    identity,
  });
  try {
    cacheSession(vaultKey, identity);
  } catch (error) {
    useVaultStore.getState().lockVault();
    throw new Error(
      `Could not retain this vault session for the current tab: ${
        error instanceof Error ? error.message : "session storage is unavailable"
      }`,
    );
  }
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isUnlocked: false,
  sessionRestored: false,
  sessionRestoreError: null,
  vaultKey: null,
  identity: null,
  restoreSession: async () => {
    if (get().sessionRestored || typeof window === "undefined") return;
    const request = ++unlockGeneration;
    let restoredVaultKey: Uint8Array | undefined;
    let restoredIdentity: IdentityKeys | undefined;
    try {
      const cached = window.sessionStorage.getItem(SESSION_CACHE_KEY);
      if (!cached) {
        set({ sessionRestored: true, sessionRestoreError: null });
        return;
      }
      const session = parseCachedSession(JSON.parse(cached) as unknown);
      const sodium = await initCrypto();
      restoredVaultKey = base64ToBytes(session.vaultKey);
      restoredIdentity = {
        signingPublicKey: base64ToBytes(session.identity.signingPublicKey),
        signingPrivateKey: base64ToBytes(session.identity.signingPrivateKey),
        encryptionPublicKey: base64ToBytes(session.identity.encryptionPublicKey),
        encryptionPrivateKey: base64ToBytes(session.identity.encryptionPrivateKey),
      };
      const validLengths =
        restoredVaultKey.length === sodium.crypto_secretbox_KEYBYTES &&
        restoredIdentity.signingPublicKey.length === sodium.crypto_sign_PUBLICKEYBYTES &&
        restoredIdentity.signingPrivateKey.length === sodium.crypto_sign_SECRETKEYBYTES &&
        restoredIdentity.encryptionPublicKey.length === sodium.crypto_box_PUBLICKEYBYTES &&
        restoredIdentity.encryptionPrivateKey.length === sodium.crypto_box_SECRETKEYBYTES;
      if (!validLengths) {
        throw new Error("Cached vault session has invalid key lengths.");
      }
      if (request !== unlockGeneration) {
        restoredVaultKey.fill(0);
        restoredIdentity.signingPublicKey.fill(0);
        restoredIdentity.signingPrivateKey.fill(0);
        restoredIdentity.encryptionPublicKey.fill(0);
        restoredIdentity.encryptionPrivateKey.fill(0);
        return;
      }
      set({
        isUnlocked: true,
        sessionRestored: true,
        sessionRestoreError: null,
        vaultKey: restoredVaultKey,
        identity: restoredIdentity,
      });
    } catch (error) {
      restoredVaultKey?.fill(0);
      restoredIdentity?.signingPublicKey.fill(0);
      restoredIdentity?.signingPrivateKey.fill(0);
      restoredIdentity?.encryptionPublicKey.fill(0);
      restoredIdentity?.encryptionPrivateKey.fill(0);
      clearSessionCache();
      set({
        sessionRestored: true,
        sessionRestoreError: `Could not restore the current-tab vault session: ${
          error instanceof Error ? error.message : "cached session is invalid"
        }`,
        isUnlocked: false,
        vaultKey: null,
        identity: null,
      });
    }
  },
  unlockVault: async (passphrase) => hydrateVault(passphrase),
  unlockWithRecoveryPhrase: async (phrase) =>
    hydrateVault(phrase.trim().replace(/\s+/g, " ").toLowerCase(), true),
  lockVault: () => {
    unlockGeneration += 1;
    const state = get();
    clearKeys(state);
    set({
      isUnlocked: false,
      sessionRestored: true,
      sessionRestoreError: null,
      vaultKey: null,
      identity: null,
    });
  },
  clearMemoryKeys: () => {
    unlockGeneration += 1;
    const state = get();
    clearKeys(state);
    set({
      isUnlocked: false,
      sessionRestored: true,
      sessionRestoreError: null,
      vaultKey: null,
      identity: null,
    });
  },
}));
