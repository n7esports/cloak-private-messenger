# Engineering Rules & Guidelines for Cloak Private Messenger

## Core Principles
- Strict Zero-Knowledge: No plaintext or raw private keys must ever leave the client, be written to unencrypted storage, or appear in console logs.
- Absolute Zero Telemetry: No analytics, tracking pixels, or external API calls outside the configured relay service.
- Strict Type Safety: Use TypeScript strict mode exclusively. Never use `any`, `unknown` casts without type guards, or `@ts-ignore`.

## Cryptography Directives
- Use `libsodium-wrappers` for all cryptographic operations.
- Always ensure `await sodium.ready` resolves before executing crypto functions.
- Argon2id key derivation parameters: `libsodium` defaults or higher (`OPSLIMIT_MODERATE`, `MEMLIMIT_MODERATE`).
- Public key encryption: Use `crypto_box_easy` / `crypto_box_open_easy` or `crypto_aead_xchacha20poly1305_ietf`.
- Signatures: Use `crypto_sign_detached` and `crypto_sign_verify_detached` (Ed25519).
- Key Storage: Raw keys must remain in memory (Zustand ephemeral state) or stored inside IndexedDB (Dexie) wrapped in authenticated encryption.

## UI/UX & Design Tokens
- Dark Mode Only:
  - Background Base: `#09090b` (obsidian)
  - Surface 1: `#18181b` | Surface 2: `#27272a` | Border: `#3f3f46`
  - Accent: `#10b981` (cyber-emerald) | Accent Hover: `#059669`
  - Text Primary: `#fafafa` | Text Muted: `#a1a1aa` | Danger: `#ef4444`
- Fonts: `Inter` for standard text; `JetBrains Mono` for keys, signatures, and IDs.
- Accessibility: Full keyboard navigation, proper ARIA attributes, and explicit focus indicators. Respect `prefers-reduced-motion`.