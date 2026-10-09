// Native Web Crypto API interface (P-256 + AES-GCM)
export async function generateEphemeralKeyPair(options = { extractable: false }) {
  return await globalThis.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    options.extractable,
    ["deriveKey", "deriveBits"]
  );
}

export async function deriveSharedSecret(privateKey, remotePublicKey) {
  return await globalThis.crypto.subtle.deriveKey(
    { name: "ECDH", public: remotePublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptPayload(key, plaintext) {
  const enc = new TextEncoder();
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertextBuffer = await globalThis.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  
  return JSON.stringify({
    v: 1,
    iv: Array.from(iv),
    ciphertext: Array.from(new Uint8Array(ciphertextBuffer))
  });
}

export async function decryptPayload(key, jsonEnvelope) {
  const envelope = typeof jsonEnvelope === 'string' ? JSON.parse(jsonEnvelope) : jsonEnvelope;
  const dec = new TextDecoder();
  const iv = new Uint8Array(envelope.iv);
  const ciphertext = new Uint8Array(envelope.ciphertext);
  
  const decryptedBuffer = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );
  
  return dec.decode(decryptedBuffer);
}

export async function exportPublicKey(publicKey) {
  const exported = await globalThis.crypto.subtle.exportKey("jwk", publicKey);
  return JSON.stringify(exported);
}

export async function importPublicKey(jwkString) {
  const jwk = typeof jwkString === 'string' ? JSON.parse(jwkString) : jwkString;
  return await globalThis.crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
}

export async function createSession(remotePubJwk) {
  const keyPair = await generateEphemeralKeyPair({ extractable: true });
  const remotePub = await importPublicKey(remotePubJwk);
  const sharedKey = await deriveSharedSecret(keyPair.privateKey, remotePub);
  const publicKey = await exportPublicKey(keyPair.publicKey);
  return { publicKey, sharedKey };
}

export function isCryptoAvailable() {
  return typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.subtle !== 'undefined';
}
