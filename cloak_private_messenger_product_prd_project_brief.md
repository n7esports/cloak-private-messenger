# Project PRD & Product Brief: Cloak Private Messenger

**Document Version:** 1.0.0  
**Classification:** Confidential / Zero-Trust Specification  
**Product Team:** Core Cryptography & UI Architecture  
**Target Form Factors:** Responsive Web Workbench (Desktop) & Handset PWA / Mobile (iOS/Android responsive)

---

## 1. Executive Summary & Vision

### 1.1 Vision Statement
**Cloak Private Messenger** is an ultra-private, zero-trust, ephemeral communication platform engineered for high-risk communicators, operational teams, and privacy advocates. Cloak removes digital footprints by combining browser-level cryptography (AES-256-GCM + X25519 Ephemeral Key Exchange) with a volatile RAM-only data lifecycle and an emergency "Nuke" purge protocol.

### 1.2 Core Problem
Conventional messaging apps claim end-to-end encryption (E2EE) but retain persistent metadata, require centralized account bindings (phone numbers, email addresses), and maintain device backups vulnerable to physical forensics or cloud subpoenas.

### 1.3 The Cloak Solution
- **Zero Identity Registration:** No phone numbers, emails, passwords, or persistent account identities. Ephemeral pseudonyms generated on-the-fly.
- **Pure In-Memory Volatility:** Message payloads and session keys exist solely within browser memory (RAM) and are zeroed upon window closure, timeout, or nuke trigger.
- **Client-Side Cryptography:** Browser-executed cryptographic operations ensuring server nodes relay encrypted noise without visibility into participants or content.
- **Tactical Responsive Workbench:** Dual-purpose UX featuring a developer/auditor workbench for desktop testing alongside a WhatsApp/Signal-familiar mobile chat interface.

---

## 2. Target Personas

| Persona | Primary Motivations | Critical Features Required |
| :--- | :--- | :--- |
| **Tactical Operatives & Security Researchers** | High-threat environments, covert communications without breadcrumbs. | Hexadecimal room keys, camera reticle QR scanner, RAM flush, anti-traffic analysis chaffing. |
| **Whistleblowers & Journalists** | Absolute source anonymity and untraceable source onboarding. | One-time room URLs, out-of-band QR handshakes, automated burn countdowns. |
| **Privacy-Conscious Everyday Users** | Familiar, friction-free messaging with zero tracking. | WhatsApp-style chat bubbles, voice/attachment triggers, zero configuration. |

---

## 3. Product Architecture & Technical Specifications

### 3.1 Cryptographic Suite & Data Lifecycle
- **Key Exchange (KEX):** X25519 Ephemeral Diffie-Hellman per session handshake.
- **Symmetric Cipher:** AES-256-GCM with unique 96-bit initialization vectors (IV) per message frame.
- **Ratchet Mechanism:** Ephemeral Double-Ratchet guaranteeing Perfect Forward Secrecy (PFS) and Post-Compromise Security (PCS).
- **Traffic Analysis Defense:** Constant packet-length padding (randomized chaffing frames) to thwart packet-length fingerprinting.
- **Zero-Trace Storage:** Strict prohibition of `localStorage`, `IndexedDB`, cookies, or remote server caching.

### 3.2 Ephemeral Lifecycle & Nuke Protocol
1. **Self-Destruct Timers:** Configurable burn intervals (`Off`, `5s`, `30s`, `60s`) triggered immediately upon recipient receipt.
2. **Volatile Scrubbing:** Active timers overwrite string buffers in memory before garbage collection.
3. **Emergency Nuke Protocol (`Simulate Nuke Chamber`):**
   - Cryptographic keys zeroed immediately (`ArrayBuffer.fill(0)`).
   - Chat DOM tree destroyed and replaced with zero-state visual noise.
   - Session route redirected to clean initialization state.

---

## 4. UI/UX Design System & Information Architecture

### 4.1 Visual Direction ("Cyber-Stealth Minimalist")
- **Base Canvas:** Obsidian Zinc (`#09090b`), Dark Zinc (`#18181b`), Surface Overlay (`#27272a`).
- **Active Indicators:** Cyber Emerald (`#10b981`), Mint (`#34d399`) for encryption status, active shields, and read receipts.
- **Alert / Destructive:** Crimson Rose (`#f43f5e`) for Burn warnings, Clear Chat, and Nuke controls.
- **Typography:**
  - `font-mono` (JetBrains Mono / monospace): Hex keys, session IDs, millisecond pings, countdowns.
  - `Inter` / system-ui: Interface navigation, button labels, and conversational body text.

### 4.2 Core Screens & Workspaces

```
+-------------------------------------------------------------------------+
| Cloak Workbench Chrome (Top Bar: 256-Bit E2EE Badge | Ping Monitor | QR Modal) |
+------------------+------------------------------------------------------+
| Workbench        | Viewport Area (Switchable via Tabs or Responsive Break) |
| Sidebar Controls |  1. Landing & Ephemeral Vault (Keys, QR Scanner)    |
| - Cipher Typing  |  2. Desktop Encrypted Room (Dual-column stream & log)|
| - Burn Presets   |  3. Mobile Frame (WhatsApp-style Handset UX)        |
| - Emergency Nuke |                                                      |
+------------------+------------------------------------------------------+
| [Mobile Mode] Sticky WhatsApp Bottom Bar (Chats | Rooms | QR | Settings)|
+-------------------------------------------------------------------------+
```

#### Workspace 1: Landing & Key Management
- **Ephemeral Alias Generation:** Procedural handle generator (e.g., `Phantom_Operative_99`) with randomizer reroll.
- **256-Bit Room Generator:** Hexadecimal 64-character token generator with one-click copy and join.
- **Dual-Mode Join:** Key entry text input and dynamic camera viewfinder with scanning reticle overlay.

#### Workspace 2: Active Desktop Encrypted Room
- **Header Controls:** Inline room label editing, live connection pulse, latency counter, QR share modal, and Nuke button.
- **Chat Stream:** Verified sender aliases, left/right bubbles, countdown badges, read receipts (`✓✓`), and encrypted attachment cards (`satellite_telemetry.enc`).
- **Input Bar:** Popover attachment menu, self-destruct selector, emoji trigger, focus-glow field, and send trigger.

#### Workspace 3: Mobile Handset UI (WhatsApp Parity)
- **Viewport Structure:** Responsive `max-w-sm` container, 100% fluid, zero horizontal overflow.
- **Native Header:** Avatar with status shield, room title, typing indicator ("*Cipher is typing...*"), camera and voice action icons.
- **Fixed Bottom Navigation Bar:** 4 tabs (💬 Chats, 🔑 Join / Rooms, 📱 QR Code, ⚙️ Settings / Nuke).

---

## 5. Functional Requirements Matrix

| ID | Module | Feature Description | Priority |
| :--- | :--- | :--- | :--- |
| **FR-01** | Crypto | Generate 64-character (256-bit) cryptographically random hexadecimal tokens | P0 (Must Have) |
| **FR-02** | Crypto | Implement client-side key generation with X25519 and AES-256-GCM specs | P0 (Must Have) |
| **FR-03** | Privacy | Emergency Nuke Chamber action that purges message buffers and resets session | P0 (Must Have) |
| **FR-04** | UX | Live toggle to simulate incoming typing indicators in real time | P1 (Should Have) |
| **FR-05** | UX | Burn countdown timer selector (`Off`, `5s`, `30s`, `60s`) with live countdown | P0 (Must Have) |
| **FR-06** | Mobile | Fixed WhatsApp-style 4-tab bottom navigation on mobile viewports | P0 (Must Have) |
| **FR-07** | QR Handshake | Out-of-band QR access modal with ECC fingerprint and copy-to-clipboard | P1 (Should Have) |
| **FR-08** | Scanning | Simulated camera viewfinder with alignment reticle and scanning beam | P1 (Should Have) |
| **FR-09** | Telemetry | Mock network latency jitter (14ms–24ms) and zero-trace indicator badge | P2 (Nice to Have) |

---

## 6. Non-Functional & Security Requirements

1. **Zero Client-Side Persistence:** Application code must fail gracefully and drop all state upon reload; no tokens or messages stored in local or session storage.
2. **Viewport Responsiveness:** Handset views must render without horizontal scrollbars, text clipping, or desktop mode requirements across viewport widths down to 320px.
3. **Touch Targets:** All interactive triggers on mobile viewports must meet minimum touch target standards of 44×44px.
4. **Contrast Compliance:** Emerald (`#10b981`) and muted zinc text elements must pass WCAG AA contrast standards against zinc-950 surfaces.

---

## 7. Roadmap & Next Phases

- **Phase 1 (Current):** Interactive design system, responsive UI workbench, mobile WhatsApp-style layout, mock crypto controls, and ephemeral states.
- **Phase 2:** WebRTC DataChannels integration for direct peer-to-peer (P2P) mesh transmission with STUN/TURN fallback.
- **Phase 3:** WebCrypto API production implementation with zero-knowledge room relays.
- **Phase 4:** PWA offline packaging and biometric hardware key unlocking (WebAuthn / Secure Enclave).
