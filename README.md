# Cloak Private Messenger

An asynchronous, zero-metadata private messenger using unidirectional WebSocket queues and end-to-end Web Crypto primitives.

## Structure
- `/server`: Node.js WebSocket relay node (port 8080)
- `/crypto-engine`: Native Web Crypto module (P-256 / AES-GCM)
- `/client`: Next.js React UI (port 3000)

## Quick Start
1. `cd server && npm install && npm start`
2. `cd client && npm install && npm run dev`
