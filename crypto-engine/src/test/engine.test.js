/**
 * Smoke tests for the Cloak crypto engine.
 * Run with:  node --test crypto-engine/test/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  generateEphemeralKeyPair,
  deriveSharedSecret,
  encryptPayload,
  decryptPayload,
  exportPublicKey,
  importPublicKey,
  createSession,
  isCryptoAvailable,
} from '../index.js';

test('Web Crypto is available in this runtime', () => {
  assert.equal(isCryptoAvailable(), true);
});

test('Alice ↔ Bob derive the same AES key and exchange a message', async () => {
  const alice = await generateEphemeralKeyPair();
  const bob = await generateEphemeralKeyPair();

  const alicePub = await exportPublicKey(alice.publicKey);
  const bobPub = await exportPublicKey(bob.publicKey);

  const aliceKey = await deriveSharedSecret(alice.privateKey, await importPublicKey(bobPub));
  const bobKey = await deriveSharedSecret(bob.privateKey, await importPublicKey(alicePub));

  const envelope = await encryptPayload(aliceKey, 'Cloak is end-to-end encrypted.');
  const recovered = await decryptPayload(bobKey, envelope);

  assert.equal(recovered, 'Cloak is end-to-end encrypted.');
});

test('Every message uses a fresh IV', async () => {
  const a = await generateEphemeralKeyPair();
  const b = await generateEphemeralKeyPair();
  const key = await deriveSharedSecret(a.privateKey, b.publicKey);

  const e1 = JSON.parse(await encryptPayload(key, 'same plaintext'));
  const e2 = JSON.parse(await encryptPayload(key, 'same plaintext'));

  assert.notEqual(e1.iv, e2.iv);
  assert.notEqual(e1.ciphertext, e2.ciphertext);
});

test('Tampered ciphertext is rejected by GCM', async () => {
  const a = await generateEphemeralKeyPair();
  const b = await generateEphemeralKeyPair();
  const key = await deriveSharedSecret(a.privateKey, b.publicKey);

  const envelope = JSON.parse(await encryptPayload(key, 'attack at dawn'));
  const bytes = Buffer.from(envelope.ciphertext, 'base64');
  bytes[0] ^= 0xff;
  envelope.ciphertext = bytes.toString('base64');

  await assert.rejects(() => decryptPayload(key, JSON.stringify(envelope)));
});

test('createSession returns a shareable public key', async () => {
  const bob = await generateEphemeralKeyPair();
  const bobPub = await exportPublicKey(bob.publicKey);

  const session = await createSession(bobPub);

  assert.equal(typeof session.publicKey, 'string');
  assert.ok(session.publicKey.length > 0);
  assert.ok(session.sharedKey instanceof CryptoKey);
});