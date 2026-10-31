import Dexie, { type Table } from "dexie";
import {
  decryptVaultPayload,
  encryptVaultPayload,
  initCrypto,
  type IdentityKeys,
} from "./crypto";

const WRAPPED_VAULT_KEY_STORAGE = "cloak.vault-key.v1";

export interface VaultRecord {
  id: "primary";
  nonce: Uint8Array;
  encryptedIdentity: Uint8Array;
  createdAt: number;
}

export interface EncryptedChatRecord {
  id: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  updatedAt: number;
}

export interface EncryptedMessageRecord {
  id: string;
  chatId: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  createdAt: number;
}

export interface EncryptedSessionRecord {
  id: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  updatedAt: number;
}

export interface QueuedEnvelopeRecord {
  id: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
}

export interface EncryptedNoteRecord {
  id: string;
  ciphertext: Uint8Array;
  nonce: Uint8Array;
  updatedAt: number;
}

export interface FlagRecord {
  key: string;
  value: boolean;
}

/**
 * The device vault key is never stored in plaintext next to the data it
 * protects. It is a random 32-byte key that is itself encrypted ("wrapped")
 * with an AES-GCM key that lives as a NON-EXTRACTABLE Web Crypto CryptoKey
 * inside IndexedDB. Only the wrapped (encrypted) copy ever touches
 * localStorage. An attacker who exfiltrates localStorage via XSS, a browser
 * extension, or a plaintext readout obtains a blob they cannot unwrap — the
 * wrapping key cannot leave the crypto boundary of the browser and is never
 * exposed to page JavaScript. This keeps the app opening straight into chats
 * (silent unlock, no onboarding gate) while removing the single point of
 * failure the audit flagged.
 */
const WRAPPER_KEY_DATABASE = "cloak-vault-wrapper";
const WRAPPER_KEY_STORE = "keys";
const WRAPPER_KEY_ID = "vault-wrapper";

interface WrappedVaultKeyEnvelope {
  version: 1;
  iv: string;
  ciphertext: string;
}

export class VaultStoragePermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultStoragePermissionError";
  }
}

export class VaultCorruptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VaultCorruptionError";
  }
}

function isStoragePermissionError(error: unknown): boolean {
  return (
    error instanceof Error &&
    [
      "InvalidStateError",
      "NotAllowedError",
      "SecurityError",
      "QuotaExceededError",
    ].includes(error.name)
  );
}

function rethrowVaultStorageError(error: unknown): never {
  if (error instanceof VaultStoragePermissionError) throw error;
  if (isStoragePermissionError(error)) {
    throw new VaultStoragePermissionError(
      "Browser storage is unavailable or blocked. Check your browser privacy settings and try again.",
    );
  }
  throw error;
}

class UQZERADatabase extends Dexie {
  vault!: Table<VaultRecord, VaultRecord["id"]>;
  chats!: Table<EncryptedChatRecord, string>;
  messages!: Table<EncryptedMessageRecord, string>;
  notes!: Table<EncryptedNoteRecord, string>;
  sessions!: Table<EncryptedSessionRecord, string>;
  outbox!: Table<QueuedEnvelopeRecord, string>;
  flags!: Table<FlagRecord, string>;

  constructor() {
    super("UQZERADatabase");
    this.version(1).stores({
      vault: "id",
      chats: "id, updatedAt",
      messages: "id, chatId, createdAt",
      notes: "id, updatedAt",
    });
    this.version(2).stores({
      vault: "id",
      chats: "id, updatedAt",
      messages: "id, chatId, createdAt",
      notes: "id, updatedAt",
      sessions: "id, updatedAt",
      outbox: "id, nextAttemptAt, createdAt",
    });
    this.version(3).stores({
      vault: "id",
      chats: "id, updatedAt",
      messages: "id, chatId, createdAt",
      notes: "id, updatedAt",
      sessions: "id, updatedAt",
      outbox: "id, nextAttemptAt, createdAt",
      flags: "key",
    });
  }
}

export const database = new UQZERADatabase();

export async function getDB(): Promise<typeof database> {
  await database.open();
  return database;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function openWrapperDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is required to protect the vault key."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(WRAPPER_KEY_DATABASE, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(WRAPPER_KEY_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Could not open the vault key store."));
    request.onblocked = () =>
      reject(new Error("Vault key store upgrade was blocked."));
  });
}

async function idbGet<T>(database: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(WRAPPER_KEY_STORE, "readonly");
    const request = transaction.objectStore(WRAPPER_KEY_STORE).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () =>
      reject(request.error || new Error("Could not read the vault key store."));
  });
}

async function idbPut(database: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(WRAPPER_KEY_STORE, "readwrite");
    transaction.objectStore(WRAPPER_KEY_STORE).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error || new Error("Could not write the vault key store."));
    transaction.onabort = () =>
      reject(new Error("Writing the vault key store was aborted."));
  });
}

function idbDeleteWrapperDatabase(): Promise<void> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is unavailable; the vault key store could not be erased."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(WRAPPER_KEY_DATABASE);
    request.onsuccess = () => resolve();
    request.onerror = () =>
      reject(request.error || new Error("The vault key store could not be erased."));
    request.onblocked = () =>
      reject(new Error("The vault key store deletion was blocked."));
  });
}

/**
 * Returns the non-extractable AES-GCM wrapping key, generating it once per
 * device. Non-extractable means even page JavaScript cannot export its raw
 * bytes — it can only encrypt/decrypt through the crypto boundary.
 */
async function getOrCreateWrapperKey(): Promise<CryptoKey> {
  const database = await openWrapperDatabase();
  try {
    const existing = await idbGet<CryptoKey>(database, WRAPPER_KEY_ID);
    if (existing) return existing;
    const key = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      false, // NOT extractable — the key can never be read out of the crypto layer.
      ["encrypt", "decrypt"],
    );
    await idbPut(database, WRAPPER_KEY_ID, key);
    return key;
  } finally {
    database.close();
  }
}

export async function wrapVaultKey(key: Uint8Array): Promise<WrappedVaultKeyEnvelope> {
  const wrapper = await getOrCreateWrapperKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyBuffer = new Uint8Array(key); // fresh ArrayBuffer-backed copy
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrapper,
    keyBuffer,
  );
  const ivEncoded = bytesToBase64(iv); // snapshot before wiping the buffer
  keyBuffer.fill(0);
  iv.fill(0);
  return {
    version: 1,
    iv: ivEncoded,
    ciphertext: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

export async function unwrapVaultKey(envelope: WrappedVaultKeyEnvelope): Promise<Uint8Array> {
  const wrapper = await getOrCreateWrapperKey();
  const iv = new Uint8Array(base64ToBytes(envelope.iv));
  const ciphertext = new Uint8Array(base64ToBytes(envelope.ciphertext));
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      wrapper,
      ciphertext,
    );
    return new Uint8Array(plaintext);
  } finally {
    iv.fill(0);
  }
}

/**
 * Reads the device vault key. Only the encrypted (wrapped) form is kept in
 * localStorage; the raw key exists solely in memory after being unwrapped by
 * the non-extractable IndexedDB key. Returns null when no vault exists yet or
 * when the stored envelope cannot be unwrapped (e.g. the wrapping key was
 * cleared by a wipe).
 */
export async function readLocalVaultKey(): Promise<Uint8Array | null> {
  if (typeof window === "undefined") return null;
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(WRAPPED_VAULT_KEY_STORAGE);
  } catch (error) {
    rethrowVaultStorageError(error);
  }
  if (!stored) return null;

  let envelope: WrappedVaultKeyEnvelope;
  try {
    const parsed: unknown = JSON.parse(stored);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== 1 ||
      !("iv" in parsed) ||
      typeof parsed.iv !== "string" ||
      !("ciphertext" in parsed) ||
      typeof parsed.ciphertext !== "string"
    ) {
      throw new VaultCorruptionError("The saved device vault key is invalid.");
    }
    envelope = parsed as WrappedVaultKeyEnvelope;
  } catch (error) {
    if (error instanceof VaultCorruptionError) throw error;
    throw new VaultCorruptionError("The saved device vault key is corrupted.");
  }

  try {
    return await unwrapVaultKey(envelope);
  } catch (error) {
    if (isStoragePermissionError(error)) rethrowVaultStorageError(error);
    if (error instanceof VaultStoragePermissionError) throw error;
    throw new VaultCorruptionError(
      "The saved device vault key could not be decrypted. Your browser storage may have changed.",
    );
  }
}

export async function getOrCreateLocalVaultKey(): Promise<Uint8Array> {
  const existing = await readLocalVaultKey();
  if (existing) return existing;
  if (typeof window === "undefined") {
    throw new Error("Vault key storage is unavailable in this environment.");
  }
  const sodium = await initCrypto();
  const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
  try {
    const wrapped = await wrapVaultKey(key);
    window.localStorage.setItem(WRAPPED_VAULT_KEY_STORAGE, JSON.stringify(wrapped));
    return key;
  } catch (error) {
    key.fill(0);
    rethrowVaultStorageError(error);
  }
}

export function clearLocalVaultKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(WRAPPED_VAULT_KEY_STORAGE);
}

function serializeIdentity(
  identity: IdentityKeys,
  crypto: Awaited<ReturnType<typeof initCrypto>>,
): Uint8Array {
  const keys = [
    identity.signingPublicKey,
    identity.signingPrivateKey,
    identity.encryptionPublicKey,
    identity.encryptionPrivateKey,
  ];
  const expectedLengths = [
    crypto.crypto_sign_PUBLICKEYBYTES,
    crypto.crypto_sign_SECRETKEYBYTES,
    crypto.crypto_box_PUBLICKEYBYTES,
    crypto.crypto_box_SECRETKEYBYTES,
  ];
  if (keys.some((key, index) => key.length !== expectedLengths[index])) {
    throw new Error("Identity key material has an invalid length.");
  }

  const plaintext = new Uint8Array(
    expectedLengths.reduce((total, length) => total + length, 0),
  );
  let offset = 0;
  for (const key of keys) {
    plaintext.set(key, offset);
    offset += key.length;
  }
  return plaintext;
}

function decodeIdentity(
  plaintext: Uint8Array,
  crypto: Awaited<ReturnType<typeof initCrypto>>,
): IdentityKeys {
  const lengths = [
    crypto.crypto_sign_PUBLICKEYBYTES,
    crypto.crypto_sign_SECRETKEYBYTES,
    crypto.crypto_box_PUBLICKEYBYTES,
    crypto.crypto_box_SECRETKEYBYTES,
  ];
  if (plaintext.length !== lengths.reduce((total, length) => total + length, 0)) {
    throw new Error("The encrypted vault contains invalid identity data.");
  }

  let offset = 0;
  const keys = lengths.map((length) => {
    const key = plaintext.slice(offset, offset + length);
    offset += length;
    return key;
  });
  return {
    signingPublicKey: keys[0],
    signingPrivateKey: keys[1],
    encryptionPublicKey: keys[2],
    encryptionPrivateKey: keys[3],
  };
}

export async function saveIdentityWithVaultKey(
  identity: IdentityKeys,
  vaultKey: Uint8Array,
): Promise<void> {
  const sodium = await initCrypto();
  const plaintext = serializeIdentity(identity, sodium);
  try {
    const encrypted = await encryptVaultPayload(plaintext, vaultKey);
    await database.vault.put({
      id: "primary",
      nonce: encrypted.nonce,
      encryptedIdentity: encrypted.ciphertext,
      createdAt: Date.now(),
    });
  } finally {
    plaintext.fill(0);
  }
}

export async function decryptIdentityWithVaultKey(
  record: VaultRecord,
  vaultKey: Uint8Array,
): Promise<IdentityKeys> {
  const plaintext = await decryptVaultPayload(
    record.encryptedIdentity,
    record.nonce,
    vaultKey,
  );
  try {
    return decodeIdentity(plaintext, await initCrypto());
  } finally {
    plaintext.fill(0);
  }
}

export async function wipeVaultDatabase(): Promise<void> {
  const errors: unknown[] = [];
  if (typeof indexedDB === "undefined") {
    errors.push(
      new Error("IndexedDB is unavailable; stored databases could not be erased."),
    );
  } else {
    try {
      await database.delete();
    } catch (error) {
      errors.push(error);
    }
  }
  try {
    clearLocalVaultKey();
  } catch (error) {
    errors.push(error);
  }
  try {
    await idbDeleteWrapperDatabase();
  } catch (error) {
    errors.push(error);
  }
  if (errors.length) {
    throw new AggregateError(errors, "The device vault could not be completely erased.");
  }
}
