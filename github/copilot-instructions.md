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

## UI/UX & Visual Design System
- Dark Mode Only:
  - Background Base: `#09090b` (obsidian)
  - Surface 1: `#18181b` | Surface 2: `#27272a` | Border: `#27272a` / `#3f3f46`
  - Accent: `#10b981` (cyber-emerald) | Accent Hover: `#059669`
  - Text Primary: `#fafafa` | Text Muted: `#a1a1aa` | Danger: `#ef4444`
- Zero Emojis: Do NOT use unicode emojis anywhere in UI text, mock state, notifications, or toasts. Use vector icons (Lucide React with `strokeWidth={1.5}`) or custom SVGs.
- Typography Rigor:
  - Primary UI: `Inter` (`font-sans`).
  - Cryptographic Data (Keys, Hashes, Fingerprints, Signatures, Envelopes, Timestamps): `JetBrains Mono` (`font-mono text-xs`).
  - Monospace keys must be rendered in styled tech badges (`bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-xs text-emerald-400/90`).
- Human-Crafted Polish: Use crisp 1px borders (`border-zinc-800`), custom dark scrollbars, subtle active button feedback (`whileTap={{ scale: 0.98 }}`), and clear keyboard focus rings (`focus-visible:ring-1 focus-visible:ring-emerald-500`).

## Motion & Micro-Interactions (`motion/react`)
- Transitions: Fast and deliberate (150ms – 250ms). Use Vercel/Apple-style easing curve `[0.16, 1, 0.3, 1]`.
- Modals/Panels: Smooth entrance with subtle slide (`initial={{ opacity: 0, scale: 0.98, y: 8 }}`, `animate={{ opacity: 1, scale: 1, y: 0 }}`).
- Message Feed: Animate dynamic lists using `AnimatePresence mode="popLayout"`. Fade in incoming messages with slight vertical translation (`y: 6` to `y: 0`).
- Accessibility: Honor `prefers-reduced-motion` settings.

# Copilot Execution Rules

- **No Execution Loops:** Do NOT run terminal commands, execute tests, or re-run build scripts automatically unless explicitly requested in the prompt.
- **Single-Pass Output:** Generate the full proposed code or changes in a single pass. Do not write test scripts to verify your own code unless asked.
- **Strict Scope:** Focus strictly on the files currently open or explicitly mentioned in the user prompt. Do not re-index or re-read unrelated files in the project.
- **No Self-Correction Loops:** If there is a syntax error or failing build, report the exact issue to the user in prose instead of attempting to run multiple fix-and-test loops.