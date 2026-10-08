import sodium from "libsodium-wrappers-sumo";

export interface IdentityKeys {
  signingPublicKey: Uint8Array;
  signingPrivateKey: Uint8Array;
  encryptionPublicKey: Uint8Array;
  encryptionPrivateKey: Uint8Array;
}

export interface EncryptedPayload {
  ciphertext: Uint8Array;
  nonce: Uint8Array;
}

let initialization: Promise<typeof sodium> | undefined;

export function initCrypto(): Promise<typeof sodium> {
  initialization ??= sodium.ready.then(() => sodium);
  return initialization;
}

export async function generateIdentity(): Promise<IdentityKeys> {
  const crypto = await initCrypto();
  const signing = crypto.crypto_sign_keypair();
  const encryption = crypto.crypto_box_keypair();

  return {
    signingPublicKey: signing.publicKey,
    signingPrivateKey: signing.privateKey,
    encryptionPublicKey: encryption.publicKey,
    encryptionPrivateKey: encryption.privateKey,
  };
}

export async function deriveVaultKey(
  passphrase: string,
  salt: Uint8Array,
): Promise<Uint8Array> {
  const crypto = await initCrypto();
  if (salt.length !== crypto.crypto_pwhash_SALTBYTES) {
    throw new Error(
      `Vault salt must be ${crypto.crypto_pwhash_SALTBYTES} bytes.`,
    );
  }
  if (passphrase.length === 0) {
    throw new Error("A non-empty passphrase is required.");
  }

  return crypto.crypto_pwhash(
    crypto.crypto_secretbox_KEYBYTES,
    passphrase,
    salt,
    crypto.crypto_pwhash_OPSLIMIT_MODERATE,
    crypto.crypto_pwhash_MEMLIMIT_MODERATE,
    crypto.crypto_pwhash_ALG_ARGON2ID13,
  );
}

export async function encryptPayload(
  plaintext: Uint8Array,
  recipientPubKey: Uint8Array,
  senderPrivKey: Uint8Array,
): Promise<EncryptedPayload> {
  const crypto = await initCrypto();
  const nonce = crypto.randombytes_buf(crypto.crypto_box_NONCEBYTES);
  const ciphertext = crypto.crypto_box_easy(
    plaintext,
    nonce,
    recipientPubKey,
    senderPrivKey,
  );

  return { ciphertext, nonce };
}

export async function decryptPayload(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  senderPubKey: Uint8Array,
  recipientPrivKey: Uint8Array,
): Promise<Uint8Array> {
  const crypto = await initCrypto();
  return crypto.crypto_box_open_easy(
    ciphertext,
    nonce,
    senderPubKey,
    recipientPrivKey,
  );
}

export async function signMessage(
  message: Uint8Array,
  privateKey: Uint8Array,
): Promise<Uint8Array> {
  const crypto = await initCrypto();
  return crypto.crypto_sign_detached(message, privateKey);
}

export async function verifySignature(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  const crypto = await initCrypto();
  return crypto.crypto_sign_verify_detached(signature, message, publicKey);
}

export async function encryptVaultPayload(
  plaintext: Uint8Array,
  vaultKey: Uint8Array,
): Promise<EncryptedPayload> {
  const crypto = await initCrypto();
  const nonce = crypto.randombytes_buf(crypto.crypto_secretbox_NONCEBYTES);
  const ciphertext = crypto.crypto_secretbox_easy(plaintext, nonce, vaultKey);

  return { ciphertext, nonce };
}

export async function decryptVaultPayload(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  vaultKey: Uint8Array,
): Promise<Uint8Array> {
  const crypto = await initCrypto();
  return crypto.crypto_secretbox_open_easy(ciphertext, nonce, vaultKey);
}
