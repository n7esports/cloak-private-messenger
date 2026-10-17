Act as a Principal Full-Stack Engineer and AI Systems Architect specializing in Google Stitch UI Prototyping, Next.js, and WebRTC/Cryptography workflows.

Perform a full-code audit of the Cloak repository (`client/` and `server/`), extract every functional feature, and automatically generate two deliverables:
1. A consolidated, standalone Google Stitch AI prompt designed to generate a 100% pixel-perfect, fully interactive Stitch prototype across all screens.
2. An automated client-side component-stitching suite (`client/src/components/prototype/`) that binds all Cloak state stores (`useChatStore`), simulated relay WebSockets, and UI views into an instant, zero-backend, fully clickable demo for stakeholder previewing.

---

### Phase 1: Repository Audit & Feature Mapping
Scan `client/` and `server/` to extract and document every functional flow:
1. **Security & Cryptography:** P-256 ECDH key generation, AES-GCM encryption, local encrypted vault state, and QR-based contact exchange.
2. **Conversation Views:** Direct E2EE messaging, Private Notes on-device store, active typing indicators, auto-disappearing/ephemeral timers, and message reactions.
3. **Contact Management:** Mandatory contact naming validation, raw public key ingestion, and camera-based QR scanning.
4. **Channel Infrastructure:** Channel list views, subscriber key rotation concepts, and broadcast layout states.
5. **Mobile & Desktop Responsive Modes:** Glassmorphism UI, bottom safe-area insets, top-right dropdown menus, and touch context menus.

---

### Phase 2: Google Stitch Master Prompt Generation
Construct a structured, copy-pasteable prompt optimized for Google Stitch (Gemini 2.5 Pro mode). The prompt must instruct Stitch to generate a full responsive preview application containing:
- **Design System:** Glassmorphic translucent surfaces (`backdrop-blur-xl`), deep dark slate (`#090d16`) / frosted white light themes, emerald green primary accents (`#10b981`), and compact inline SVG badges (`LockClosedIcon`, `ShieldCheckIcon`).
- **Interactive Prototype Canvas (Multi-Screen Stitching):**
  - **Screen A (Chats List):** Sidebar navigation, "Device Vault" badge, real-time "Relay Connected" pill, and "Channels" bottom elevated glass trigger.
  - **Screen B (Active Encrypted Chat):** Header action buttons (Video, Voice, Key Details), message bubbles with embedded top-right dropdown chevrons, floating reaction bar, and bottom action bar (disappearing timer pill, emoji picker, attachment upload, mic icon).
  - **Screen C (Key & Contact Exchange Modal):** Dual tabs ("My Public Key" with rendered QR code & raw 256-bit hex, and "Add Contact" with required contact name validation and camera scanner button).
  - **Screen D (Channels Screen):** Sidebar-matched channel list with active state highlights (`border-l-4 border-emerald-500`) and channel broadcast preview card.
  - **Screen E (Mobile Action Menus):** Top-right dropdown aligned cleanly (`align="end"`) and long-press message context menu elevated above a dimmed overlay.

---

### Phase 3: Automated Client-Side Mock Prototype Setup
Create a standalone prototype wrapper in `client/src/components/prototype/PrototypeRunner.tsx` that stitches the entire Cloak UI together without requiring an active backend or relay server:
1. **Mock Relay Engine (`client/src/lib/prototype/mockRelay.ts`):**
   - Provide pre-populated mock contacts (`Alice (Key Exchange Verified)`, `Bob (Private Vault)`) with predefined valid P-256 key pairs.
   - Simulate incoming encrypted websocket packets, typing indicators, and message delivery receipts (`Read`, `Delivered`).
2. **Interactive State Binding (`client/app/prototype/page.tsx`):**
   - Expose a dedicated demo URL route (`/prototype`) that instantiates `useChatStore` with mock data pre-loaded.
   - Wire all buttons, modals (`KeyExchangeModal`, `NewChatModal`, `PasscodeModal`), theme toggles (Dark/Light/Slate), and mobile touch events so every control is 100% clickable and functional during client demos.

---

### Phase 4: Execution & Verification
1. Output the complete, structured Google Stitch Master Prompt into a markdown document (`STITCH_PROTOTYPE_PROMPT.md`).
2. Create and commit the `/prototype` mock runner files inside `client/`.
3. Execute `npm run build` inside `client/` to verify zero TypeScript, compilation, or routing errors.