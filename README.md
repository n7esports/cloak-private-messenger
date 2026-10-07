# Cloak Private Messenger

An ephemeral private messenger using 256-bit hexadecimal room keys, AES-256-GCM message encryption, and Supabase Realtime broadcasts.

## Structure
- `/server`: Node.js WebSocket relay node (port 8080)
- `/crypto-engine`: Native Web Crypto encryption primitives
- `/client`: Next.js React UI (port 3000)

## Key-based rooms
Generate a random 32-byte key in the client or paste a peer's 64-character hexadecimal key. The client imports the key directly as a non-extractable AES-256-GCM key and hashes its bytes with SHA-256 to derive the Realtime room name. The raw key and message history are not persisted or put in the URL; share the key with peers over a trusted private channel.

## Quick Start
1. `cd server && npm install && npm start`
2. `cd client && npm install && npm run dev`
