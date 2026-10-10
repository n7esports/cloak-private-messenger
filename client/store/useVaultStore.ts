"use client";

import { create } from "zustand";
import { initCrypto, type IdentityKeys } from "../lib/crypto";
import {
  decryptIdentityWithVaultKey,
  database,
  getOrCreateLocalVaultKey,
  readLocalVaultKey,
  saveIdentityWithVaultKey,
  type VaultRecord,
} from "../lib/vault";

const LOCK_FLAG = "cloak.locked";

interface VaultState {
  isUnlocked: boolean;
  sessionRestored: boolean;
  sessionRestoreError: string | null;
  vaultKey: Uint8Array | null;
  identity: IdentityKeys | null;
  initializeVault: () => Promise<void>;
  unlockVault: () => Promise<void>;
  lockVault: () => void;
  clearMemoryKeys: () => void;
}

let unlockGeneration = 0;
let initialization: Promise<void> | undefined;
const memoryKeyCleanups = new Set<() => void>();

function isLockFlagged(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(LOCK_FLAG) === "1";
  } catch {
    return false;
  }
}

function setLockFlag(locked: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (locked) window.sessionStorage.setItem(LOCK_FLAG, "1");
    else window.sessionStorage.removeItem(LOCK_FLAG);
  } catch {
    // The in-memory lock state still applies for the current page.
  }
}

function clearKeys(state: Pick<VaultState, "vaultKey" | "identity">): void {
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

async function createIdentityWithVaultKey(vaultKey: Uint8Array): Promise<IdentityKeys> {
  const sodium = await initCrypto();
  const signing = sodium.crypto_sign_keypair();
  const encryption = sodium.crypto_box_keypair();
  const identity: IdentityKeys = {
    signingPublicKey: signing.publicKey,
    signingPrivateKey: signing.privateKey,
    encryptionPublicKey: encryption.publicKey,
    encryptionPrivateKey: encryption.privateKey,
  };
  await saveIdentityWithVaultKey(identity, vaultKey);
  return identity;
}

/**
 * Loads the device vault and unlocks it silently. When no vault exists yet a
 * device identity is generated on first open, so the app lands straight in the
 * chats view with no onboarding gate. A manual lock within the tab is honoured
 * until the passcode clears it.
 */
async function unlockFromLocalKey(): Promise<void> {
  const request = ++unlockGeneration;
  let vaultKey: Uint8Array | undefined;
  let identity: IdentityKeys | undefined;
  try {
    vaultKey = await getOrCreateLocalVaultKey();
    const record: VaultRecord | undefined = await database.vault.get("primary");
    identity = record
      ? await decryptIdentityWithVaultKey(record, vaultKey)
      : await createIdentityWithVaultKey(vaultKey);

    if (request !== unlockGeneration) {
      vaultKey.fill(0);
      identity.signingPrivateKey.fill(0);
      identity.encryptionPrivateKey.fill(0);
      identity.signingPublicKey.fill(0);
      identity.encryptionPublicKey.fill(0);
      return;
    }

    useVaultStore.setState({
      isUnlocked: true,
      sessionRestored: true,
      sessionRestoreError: null,
      vaultKey,
      identity,
    });
  } catch (error) {
    vaultKey?.fill(0);
    identity?.signingPrivateKey.fill(0);
    identity?.encryptionPrivateKey.fill(0);
    identity?.signingPublicKey.fill(0);
    identity?.encryptionPublicKey.fill(0);
    useVaultStore.setState({
      sessionRestored: true,
      sessionRestoreError: `Could not open the device vault: ${
        error instanceof Error ? error.message : "vault data is invalid"
      }`,
      isUnlocked: false,
      vaultKey: null,
      identity: null,
    });
  }
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isUnlocked: false,
  sessionRestored: false,
  sessionRestoreError: null,
  vaultKey: null,
  identity: null,
  initializeVault: async () => {
    if (get().sessionRestored || typeof window === "undefined") return;
    if (isLockFlagged()) {
      set({
        isUnlocked: false,
        sessionRestored: true,
        sessionRestoreError: null,
        vaultKey: null,
        identity: null,
      });
      return;
    }
    initialization ??= unlockFromLocalKey().finally(() => {
      initialization = undefined;
    });
    await initialization;
  },
  unlockVault: async () => {
    setLockFlag(false);
    await unlockFromLocalKey();
  },
  lockVault: () => {
    unlockGeneration += 1;
    initialization = undefined;
    setLockFlag(true);
    clearKeys(get());
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
    clearKeys(get());
    set({
      isUnlocked: false,
      sessionRestored: true,
      sessionRestoreError: null,
      vaultKey: null,
      identity: null,
    });
  },
}));

export { readLocalVaultKey as readVaultKey };
