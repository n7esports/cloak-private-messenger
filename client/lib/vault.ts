import Dexie, { type Table } from "dexie";
import {
  decryptVaultPayload,
  encryptVaultPayload,
  initCrypto,
  type IdentityKeys,
} from "./crypto";

const LOCAL_VAULT_KEY_STORAGE = "cloak.vault-key.v1";

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

class CloakDatabase extends Dexie {
  vault!: Table<VaultRecord, VaultRecord["id"]>;
  chats!: Table<EncryptedChatRecord, string>;
  messages!: Table<EncryptedMessageRecord, string>;
  notes!: Table<EncryptedNoteRecord, string>;
  sessions!: Table<EncryptedSessionRecord, string>;
  outbox!: Table<QueuedEnvelopeRecord, string>;
  flags!: Table<FlagRecord, string>;

  constructor() {
    super("CloakDatabase");
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

export const database = new CloakDatabase();

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

/**
 * Reads the device vault key from local storage. This key encrypts the
 * identity and every chat/message/note in IndexedDB, so the vault stays
 * encrypted at rest while still unlocking silently when the app opens.
 */
export function readLocalVaultKey(): Uint8Array | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(LOCAL_VAULT_KEY_STORAGE);
  if (!stored) return null;
  try {
    return base64ToBytes(stored);
  } catch {
    window.localStorage.removeItem(LOCAL_VAULT_KEY_STORAGE);
    return null;
  }
}

export async function getOrCreateLocalVaultKey(): Promise<Uint8Array> {
  const existing = readLocalVaultKey();
  if (existing) return existing;
  if (typeof window === "undefined") {
    throw new Error("Vault key storage is unavailable in this environment.");
  }
  const sodium = await initCrypto();
  const key = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
  window.localStorage.setItem(LOCAL_VAULT_KEY_STORAGE, bytesToBase64(key));
  return key;
}

export function clearLocalVaultKey(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LOCAL_VAULT_KEY_STORAGE);
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
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable; stored databases could not be erased.");
  }
  await database.delete();
  clearLocalVaultKey();
}
