import Dexie, { type Table } from "dexie";
import {
  decryptVaultPayload,
  deriveVaultKey,
  encryptVaultPayload,
  initCrypto,
  type IdentityKeys,
} from "./crypto";

export interface VaultRecord {
  id: "primary";
  salt: Uint8Array;
  nonce: Uint8Array;
  encryptedIdentity: Uint8Array;
  recoverySalt: Uint8Array;
  recoveryNonce: Uint8Array;
  recoveryCiphertext: Uint8Array;
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

export async function saveEncryptedIdentity(
  passphrase: string,
  recoveryPhrase: string,
  identity: IdentityKeys,
): Promise<void> {
  const sodium = await initCrypto();
  const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const recoverySalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
  const plaintext = serializeIdentity(identity, sodium);
  let passphraseKey: Uint8Array | undefined;
  let recoveryKey: Uint8Array | undefined;

  try {
    passphraseKey = await deriveVaultKey(passphrase, salt);
    recoveryKey = await deriveVaultKey(recoveryPhrase, recoverySalt);
    const encrypted = await encryptVaultPayload(plaintext, passphraseKey);
    const recoveryEncrypted = await encryptVaultPayload(plaintext, recoveryKey);
    await database.vault.put({
      id: "primary",
      salt,
      nonce: encrypted.nonce,
      encryptedIdentity: encrypted.ciphertext,
      recoverySalt,
      recoveryNonce: recoveryEncrypted.nonce,
      recoveryCiphertext: recoveryEncrypted.ciphertext,
      createdAt: Date.now(),
    });
  } finally {
    plaintext.fill(0);
    passphraseKey?.fill(0);
    recoveryKey?.fill(0);
  }
}

export async function decryptStoredIdentity(
  record: VaultRecord,
  passphrase: string,
  useRecoveryPhrase = false,
): Promise<{ identity: IdentityKeys; vaultKey: Uint8Array }> {
  const salt = useRecoveryPhrase ? record.recoverySalt : record.salt;
  const nonce = useRecoveryPhrase ? record.recoveryNonce : record.nonce;
  const ciphertext = useRecoveryPhrase
    ? record.recoveryCiphertext
    : record.encryptedIdentity;
  const vaultKey = await deriveVaultKey(passphrase, salt);
  let plaintext: Uint8Array | undefined;

  try {
    plaintext = await decryptVaultPayload(ciphertext, nonce, vaultKey);
    return { identity: decodeIdentity(plaintext, await initCrypto()), vaultKey };
  } catch (error) {
    vaultKey.fill(0);
    throw error;
  } finally {
    plaintext?.fill(0);
  }
}

export async function wipeVaultDatabase(): Promise<void> {
  await database.delete();
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is unavailable; stored databases could not be erased.");
  }
  if (typeof indexedDB.databases !== "function") {
    throw new Error("This browser cannot enumerate IndexedDB databases for Panic Wipe.");
  }

  const databases = await indexedDB.databases();
  for (const entry of databases) {
    const name = entry.name;
    if (!name) continue;
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () =>
        reject(
          request.error ??
            new Error(`Could not delete IndexedDB database "${name}".`),
        );
      request.onblocked = () =>
        reject(
          new Error(
            `Deletion of IndexedDB database "${name}" was blocked by another open tab.`,
          ),
        );
    });
  }
}
