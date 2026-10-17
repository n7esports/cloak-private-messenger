# @cloak/crypto-engine

Zero-dependency Web Crypto primitives for **Cloak Private Messenger**.

- **Client room keys:** 256-bit keys imported directly as non-extractable AES keys
- **Payload cipher:** **AES-256-GCM** with a fresh 96-bit IV per message
- **Wire format:** `{ v, iv, ciphertext }` — JSON-serializable byte arrays
- **Optional helper:** ECDH over NIST **P-256** remains available for other callers
- **Runtime:** any environment exposing `globalThis.crypto.subtle`
  (browsers, Node ≥ 18, Deno, Bun, Workers, Edge)

## Usage

```js
import { decryptPayload, encryptPayload } from './index.js';

// Both peers import the same 32-byte secret shared privately out of band.
const sharedKeyHex = 'replace-with-the-64-character-key';
const roomKeyBytes = Uint8Array.from(
  sharedKeyHex.match(/.{2}/g),
  (byte) => Number.parseInt(byte, 16)
);
const roomKey = await crypto.subtle.importKey(
  'raw',
  roomKeyBytes,
  { name: 'AES-GCM', length: 256 },
  false,
  ['encrypt', 'decrypt']
);

const envelope = await encryptPayload(roomKey, 'hello, cloak');
const plaintext = await decryptPayload(roomKey, envelope);