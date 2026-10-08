"use client";

import { create } from "zustand";
import type { IdentityKeys } from "../lib/crypto";
import { decryptStoredIdentity, database, type VaultRecord } from "../lib/vault";

export const VAULT_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

interface VaultState {
  isUnlocked: boolean;
  vaultKey: Uint8Array | null;
  identity: IdentityKeys | null;
  unlockVault: (passphrase: string) => Promise<void>;
  unlockWithRecoveryPhrase: (phrase: string) => Promise<void>;
  lockVault: () => void;
  clearMemoryKeys: () => void;
}

let unlockGeneration = 0;
let idleTimer: ReturnType<typeof setTimeout> | undefined;
let removeAutoLockListeners: (() => void) | undefined;
const memoryKeyCleanups = new Set<() => void>();

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

function scheduleIdleLock(): void {
  if (idleTimer) clearTimeout(idleTimer);
  if (useVaultStore.getState().isUnlocked) {
    idleTimer = setTimeout(
      () => useVaultStore.getState().lockVault(),
      VAULT_IDLE_TIMEOUT_MS,
    );
  }
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
    vaultKey,
    identity,
  });
  scheduleIdleLock();
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isUnlocked: false,
  vaultKey: null,
  identity: null,
  unlockVault: async (passphrase) => hydrateVault(passphrase),
  unlockWithRecoveryPhrase: async (phrase) =>
    hydrateVault(phrase.trim().replace(/\s+/g, " ").toLowerCase(), true),
  lockVault: () => {
    unlockGeneration += 1;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = undefined;
    const state = get();
    clearKeys(state);
    set({ isUnlocked: false, vaultKey: null, identity: null });
  },
  clearMemoryKeys: () => {
    unlockGeneration += 1;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = undefined;
    const state = get();
    clearKeys(state);
    set({ isUnlocked: false, vaultKey: null, identity: null });
  },
}));

export function installAutoLockListeners(): () => void {
  if (typeof window === "undefined" || removeAutoLockListeners) {
    return () => undefined;
  }

  const onActivity = () => scheduleIdleLock();
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      useVaultStore.getState().lockVault();
    } else {
      scheduleIdleLock();
    }
  };

  const activityEvents = [
    "pointerdown",
    "pointermove",
    "keydown",
    "touchstart",
    "scroll",
  ] as const;
  for (const eventName of activityEvents) {
    window.addEventListener(eventName, onActivity, { passive: true });
  }
  document.addEventListener("visibilitychange", onVisibilityChange);
  removeAutoLockListeners = () => {
    for (const eventName of activityEvents) {
      window.removeEventListener(eventName, onActivity);
    }
    document.removeEventListener("visibilitychange", onVisibilityChange);
    removeAutoLockListeners = undefined;
  };

  return removeAutoLockListeners;
}
