# @cloak/crypto-engine

Zero-dependency client-side encryption engine for **Cloak Private Messenger**.

- **Key agreement:** ECDH over NIST **P-256**
- **Payload cipher:** **AES-256-GCM** with a fresh 96-bit IV per message
- **Wire format:** `{ v, iv, ciphertext }` — Base64, JSON-serializable
- **Runtime:** any environment exposing `globalThis.crypto.subtle`
  (browsers, Node ≥ 18, Deno, Bun, Workers, Edge)

## Usage

```js
import {
  createSession,
  encryptPayload,
  decryptPayload,
  importPublicKey,
  deriveSharedSecret,
} from '@cloak/crypto-engine';

// 1. Bob shares his public key (invite link / QR code).
const bobPublicKeyB64 = '...';

// 2. Alice boots a session and gets her own public key to send back.
const alice = await createSession(bobPublicKeyB64);

// 3. Alice encrypts a message.
const envelope = await encryptPayload(alice.sharedKey, 'hello, cloak');

// 4. Bob (using Alice's returned public key) derives the same key and decrypts.
const bobKey = await deriveSharedSecret(bobPrivateKey, await importPublicKey(alice.publicKey));
const plaintext = await decryptPayload(bobKey, envelope);