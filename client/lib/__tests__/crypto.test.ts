import { describe, expect, it } from "vitest";
import {
  decryptPayload,
  deriveVaultKey,
  encryptPayload,
  generateIdentity,
  initCrypto,
  signMessage,
  verifySignature,
} from "../crypto";

describe("crypto primitives", () => {
  it("initializes once and generates Ed25519 and X25519 identity keys", async () => {
    const [first, second] = await Promise.all([initCrypto(), initCrypto()]);
    expect(first).toBe(second);

    const identity = await generateIdentity();
    expect(identity.signingPublicKey).toHaveLength(first.crypto_sign_PUBLICKEYBYTES);
    expect(identity.signingPrivateKey).toHaveLength(first.crypto_sign_SECRETKEYBYTES);
    expect(identity.encryptionPublicKey).toHaveLength(first.crypto_box_PUBLICKEYBYTES);
    expect(identity.encryptionPrivateKey).toHaveLength(first.crypto_box_SECRETKEYBYTES);
  });

  it("derives a 256-bit Argon2id vault key", async () => {
    const sodium = await initCrypto();
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

    const key = await deriveVaultKey("correct horse battery staple", salt);

    expect(key).toHaveLength(sodium.crypto_secretbox_KEYBYTES);
    expect(await deriveVaultKey("correct horse battery staple", salt)).toEqual(key);
  });

  it("encrypts and decrypts a payload between two identities", async () => {
    const sender = await generateIdentity();
    const recipient = await generateIdentity();
    const plaintext = new TextEncoder().encode("Cloak encrypted payload");

    const encrypted = await encryptPayload(
      plaintext,
      recipient.encryptionPublicKey,
      sender.encryptionPrivateKey,
    );
    const decrypted = await decryptPayload(
      encrypted.ciphertext,
      encrypted.nonce,
      sender.encryptionPublicKey,
      recipient.encryptionPrivateKey,
    );

    expect(decrypted).toEqual(plaintext);
  });

  it("signs messages with the identity signing key", async () => {
    const identity = await generateIdentity();
    const message = new TextEncoder().encode("verified sender");
    const signature = await signMessage(message, identity.signingPrivateKey);

    await expect(
      verifySignature(message, signature, identity.signingPublicKey),
    ).resolves.toBe(true);
    await expect(
      verifySignature(
        new TextEncoder().encode("modified sender"),
        signature,
        identity.signingPublicKey,
      ),
    ).resolves.toBe(false);
  });
});
