# Cloak Private Messenger

An ephemeral private messenger using 256-bit hexadecimal room keys, AES-256-GCM message encryption, and Supabase Realtime broadcasts.

## Structure
- `/server`: Node.js WebSocket relay node (port 8080)
- `/crypto-engine`: Native Web Crypto encryption primitives
- `/client`: Next.js React UI (port 3000)

## Key-based rooms
Generate a random 32-byte key in the client or paste a peer's 64-character hexadecimal key. The client imports the key directly as a non-extractable AES-256-GCM key and hashes its bytes with SHA-256 to derive the Realtime room name. The raw key and message history are not persisted or put in the URL; share the key with peers over a trusted private channel.

## Device vault
The client also provides `/setup` and `/unlock` routes for a device identity vault. Setup generates Ed25519 and X25519 identity keys, encrypts them with an Argon2id-derived key, and stores only the encrypted key payload in IndexedDB. A BIP-39 recovery phrase encrypts a separate recovery copy and can be used to unlock the vault. The current-tab session remains unlocked across refreshes and route navigation; use the manual Lock control to require the passphrase again. Panic Wipe permanently deletes Cloak's IndexedDB database without touching other databases on the current origin.

First-time setup walks through identity, passphrase, and recovery phrase creation, then opens the encrypted, pinned Welcome Guide. Private Notes remain local to the device; expiring messages use 5-second, 1-minute, 1-hour, 1-day, or 7-day timers. The Chats area also includes a Channels overview.

## Messaging transport
Direct-message transport uses Supabase Realtime ephemeral Broadcast Channels; it does not read or write database tables for messages. Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`). Each recipient listens on a deterministic inbox channel with broadcast echo disabled, and senders publish signed encrypted envelopes using the `envelope` event. Delivery is best-effort to currently subscribed peers; it is not durable relay storage. The client encrypts its pending outbox with the unlocked vault key in IndexedDB and retries delivery with exponential backoff after the inbox channel reconnects. Supabase Realtime subscription status drives the relay indicator.

The standalone in-memory WebSocket and HTTP relay (`cd server && npm start`, `ws://localhost:8080`, `http://localhost:8080/relay`) remains available for clients that use that relay protocol. It routes signed ciphertext and holds undelivered envelopes in volatile queues for up to 24 hours; it does not persist message content. Its localhost CORS allowlist includes frontend ports 3000 and 3002; set the server's comma-separated `CLOAK_ALLOWED_ORIGINS` environment variable to allow deployed frontend origins.

The client protocol library provides sealed message envelopes, per-contact session-key rotation, and public/private channel broadcast primitives. Private channel group keys are encrypted in the local vault and are replaced when the subscriber roster changes.

## File uploads
The setup screen's optional uploader accepts files up to 5 MB. Uploads are stored on the Next.js server's local filesystem and returned through relative `/uploads/...` URLs as attachment downloads. Because these API routes require a Node.js server and local disk, run the client with `npm run dev` or `npm run build && npm start`; static export/hosting from `client/out` does not support uploads. Use persistent private object storage for deployments where local disk is ephemeral or shared between instances.

## Quick Start
1. `cd server && npm install && npm start`
2. `cd client && npm install && npm run dev`
