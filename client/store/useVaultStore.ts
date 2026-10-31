"use client";

import { create } from "zustand";
import { initCrypto, type IdentityKeys } from "../lib/crypto";
import {
  decryptIdentityWithVaultKey,
  database,
  getOrCreateLocalVaultKey,
  readLocalVaultKey,
  saveIdentityWithVaultKey,
  VaultCorruptionError,
  VaultStoragePermissionError,
  type VaultRecord,
} from "../lib/vault";

const LOCK_FLAG = "UQZERA.locked";

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

function isStoragePermissionFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    ["InvalidStateError", "NotAllowedError", "SecurityError", "QuotaExceededError"].includes(
      error.name,
    )
  );
}

function normalizeVaultOpenError(error: unknown): unknown {
  if (
    error instanceof VaultStoragePermissionError ||
    error instanceof VaultCorruptionError
  ) {
    return error;
  }
  if (isStoragePermissionFailure(error)) {
    return new VaultStoragePermissionError(
      "Browser storage is unavailable or blocked. Check your browser privacy settings and try again.",
    );
  }
  return error;
}

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

async function logVaultCreationConsent(): Promise<void> {
  // Best-effort: log TOS/privacy consent at vault creation (sign-up equivalent).
  // Failures are silently swallowed by the caller.
  try {
    const payload = {
      kind: "tos" as const,
      version: "1.0",
      granted: true,
      ts: new Date().toISOString(),
    };
    await fetch("/api/consent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // fire-and-forget: no credential needed for this self-logging endpoint
    });
  } catch {
    // consent logging is best-effort; vault creation must not fail because of it
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

  // Log consent at vault creation (sign-up equivalent for this client-side app).
  void logVaultCreationConsent().catch(() => { /* best-effort */ });

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
    if (record) {
      try {
        identity = await decryptIdentityWithVaultKey(record, vaultKey);
      } catch (error) {
        if (
          error instanceof VaultStoragePermissionError ||
          error instanceof VaultCorruptionError ||
          isStoragePermissionFailure(error)
        ) {
          throw error;
        }
        throw new VaultCorruptionError(
          "The encrypted device identity could not be opened. Your vault may be corrupted or its browser key storage may have changed.",
        );
      }
    } else {
      identity = await createIdentityWithVaultKey(vaultKey);
    }

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
    const reportedError = normalizeVaultOpenError(error);
    vaultKey?.fill(0);
    identity?.signingPrivateKey.fill(0);
    identity?.encryptionPrivateKey.fill(0);
    identity?.signingPublicKey.fill(0);
    identity?.encryptionPublicKey.fill(0);
    if (request !== unlockGeneration) return;
    const errorMessage =
      reportedError instanceof Error
        ? reportedError.message
        : "Could not open the device vault.";
    useVaultStore.setState({
      sessionRestored: true,
      sessionRestoreError: errorMessage,
      isUnlocked: false,
      vaultKey: null,
      identity: null,
    });
    throw reportedError;
  }
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isUnlocked: false,
  sessionRestored: false,
  sessionRestoreError: null,
  vaultKey: null,
  identity: null,
  initializeVault: async () => {
    if (
      (get().sessionRestored && !get().sessionRestoreError) ||
      typeof window === "undefined"
    ) return;
    if (get().sessionRestoreError) {
      set({ sessionRestored: false, sessionRestoreError: null });
    }
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
