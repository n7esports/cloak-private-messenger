# Cloak Private Messenger

An ephemeral private messenger using 256-bit hexadecimal room keys, AES-256-GCM message encryption, and Supabase Realtime broadcasts.

## Structure
- `/server`: Node.js WebSocket relay node (port 8080)
- `/crypto-engine`: Native Web Crypto encryption primitives
- `/client`: Next.js React UI (port 3000)

## Key-based rooms
Generate a random 32-byte key in the client or paste a peer's 64-character hexadecimal key. The client imports the key directly as a non-extractable AES-256-GCM key and hashes its bytes with SHA-256 to derive the Realtime room name. The raw key and message history are not persisted or put in the URL; share the key with peers over a trusted private channel.

## Device vault
The client also provides `/setup` and `/unlock` routes for a device identity vault. Setup generates Ed25519 and X25519 identity keys, encrypts them with an Argon2id-derived key, and stores only the encrypted key payload in IndexedDB. A BIP-39 recovery phrase encrypts a separate recovery copy and can be used to unlock the vault. The vault locks after five minutes of inactivity or when the tab is hidden. Panic Wipe permanently deletes Cloak's IndexedDB database without touching other databases on the current origin.

First-time setup walks through identity, passphrase, and recovery phrase creation, then opens the encrypted, pinned Welcome Guide. Private Notes remain local to the device; expiring messages use 5-second, 1-minute, 1-hour, 1-day, or 7-day timers. The Chats area also includes a Channels overview.

## Messaging transport
Run `cd server && npm start` for the in-memory WebSocket and HTTP relay (`ws://localhost:8080`, `http://localhost:8080/relay`). The relay routes only signed ciphertext envelopes and receipts, holds undelivered envelopes in volatile per-recipient queues for up to 24 hours, and does not persist message content. Configure `NEXT_PUBLIC_CLOAK_RELAY_URL` and optionally `NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL` to use another relay. No relay endpoint is assumed in a production build; until one is configured, outgoing messages stay encrypted in the local outbox. The client encrypts its offline outbox with the unlocked vault key.

The client protocol library provides sealed message envelopes, per-contact session-key rotation, and public/private channel broadcast primitives. Private channel group keys are encrypted in the local vault and are replaced when the subscriber roster changes.

## Quick Start
1. `cd server && npm install && npm start`
2. `cd client && npm install && npm run dev`
