# UQZERA Messenger — Design System Migration Plan

**Source:** `/tmp/UQZERA-migration/src/` (Vite + React 19 + Tailwind 4)  
**Target:** `/home/wassay/Documents/UQZERA-private-messenger/client/` (Next.js 14 + Tailwind 3)  
**Date:** 2026-10-14

---

## 1. Design Tokens — `index.css` → `globals.css`

### 1.1 New Color Tokens (from `@theme` block, lines 27–76 of source `index.css`)

The source uses Tailwind 4's `@theme` directive. These must be converted to Tailwind 3's CSS custom property pattern in `globals.css`.

| Source Token | Value | Target `globals.css` Equivalent |
|---|---|---|
| `--color-surface` | `#0f131c` | `--color-surface: 15 19 28` |
| `--color-surface-dim` | `#0f131c` | `--color-surface-dim: 15 19 28` |
| `--color-surface-bright` | `#353943` | `--color-surface-bright: 53 57 67` |
| `--color-surface-container-lowest` | `#0a0e17` | `--color-surface-container-lowest: 10 14 23` |
| `--color-surface-container-low` | `#181b25` | `--color-surface-container-low: 24 27 37` |
| `--color-surface-container` | `#1c1f29` | `--color-surface-container: 28 31 41` |
| `--color-surface-container-high` | `#262a34` | `--color-surface-container-high: 38 42 52` |
| `--color-surface-container-highest` | `#31353f` | `--color-surface-container-highest: 49 53 63` |
| `--color-on-surface` | `#dfe2ef` | `--color-on-surface: 223 226 239` |
| `--color-on-surface-variant` | `#bbcabf` | `--color-on-surface-variant: 187 202 191` |
| `--color-inverse-surface` | `#dfe2ef` | `--color-inverse-surface: 223 226 239` |
| `--color-inverse-on-surface` | `#2c303a` | `--color-inverse-on-surface: 44 48 58` |
| `--color-outline` | `#86948a` | `--color-outline: 134 148 138` |
| `--color-outline-variant` | `#3c4a42` | `--color-outline-variant: 60 74 66` |
| `--color-surface-tint` | `#4edea3` | `--color-surface-tint: 78 222 163` |
| `--color-primary` | `#4edea3` | `--color-primary: 78 222 163` |
| `--color-on-primary` | `#003824` | `--color-on-primary: 0 56 36` |
| `--color-primary-container` | `#10b981` | `--color-primary-container: 16 185 129` |
| `--color-on-primary-container` | `#00422b` | `--color-on-primary-container: 0 66 43` |
| `--color-inverse-primary` | `#006c49` | `--color-inverse-primary: 0 108 73` |
| `--color-secondary` | `#68dba9` | `--color-secondary: 104 219 169` |
| `--color-on-secondary` | `#003825` | `--color-on-secondary: 0 56 37` |
| `--color-secondary-container` | `#25a475` | `--color-secondary-container: 37 164 117` |
| `--color-on-secondary-container` | `#00311f` | `--color-on-secondary-container: 0 49 31` |
| `--color-tertiary` | `#95d3ba` | `--color-tertiary: 149 211 186` |
| `--color-on-tertiary` | `#003829` | `--color-on-tertiary: 0 56 41` |
| `--color-tertiary-container` | `#71af97` | `--color-tertiary-container: 113 175 151` |
| `--color-on-tertiary-container` | `#004231` | `--color-on-tertiary-container: 0 66 49` |
| `--color-error` | `#ffb4ab` | `--color-error: 255 180 171` |
| `--color-on-error` | `#690005` | `--color-on-error: 105 0 5` |
| `--color-error-container` | `#93000a` | `--color-error-container: 147 0 10` |
| `--color-on-error-container` | `#ffdad6` | `--color-on-error-container: 255 218 214` |
| `--color-background` | `#0f131c` | `--color-background: 15 19 28` |
| `--color-on-background` | `#dfe2ef` | `--color-on-background: 223 226 239` |
| `--color-surface-variant` | `#31353f` | `--color-surface-variant: 49 53 63` |

### 1.2 Spacing Tokens (lines 64–72)

| Source Token | Value | Target |
|---|---|---|
| `--spacing-space-xs` | `0.25rem` | `--spacing-space-xs: 0.25rem` |
| `--spacing-space-sm` | `0.5rem` | `--spacing-space-sm: 0.5rem` |
| `--spacing-space-md` | `1rem` | `--spacing-space-md: 1rem` |
| `--spacing-space-lg` | `1.5rem` | `--spacing-space-lg: 1.5rem` |
| `--spacing-space-xl` | `2rem` | `--spacing-space-xl: 2rem` |
| `--spacing-margin` | `1.5rem` | `--spacing-margin: 1.5rem` |
| `--spacing-margin-mobile` | `1rem` | `--spacing-margin-mobile: 1rem` |
| `--spacing-gutter` | `1rem` | `--spacing-gutter: 1rem` |
| `--spacing-gutter-mobile` | `0.75rem` | `--spacing-gutter-mobile: 0.75rem` |

### 1.3 Font Family Tokens (lines 74–75)

| Source Token | Value |
|---|---|
| `--font-mono` | `'JetBrains Mono', monospace` |
| `--font-sans` | `'Inter', sans-serif` |

### 1.4 Custom Typography Classes (lines 96–174)

These must be ported as regular CSS classes in `globals.css`:

- `.font-label-code-sm` — JetBrains Mono, 10px/14px, +0.04em, weight 500
- `.font-label-code-md` — JetBrains Mono, 12px/16px, +0.025em, weight 400
- `.font-label-code-lg` — JetBrains Mono, 14px/20px, +0.02em, weight 500
- `.font-body-sm` — Inter, 12px/16px, +0.01em, weight 400
- `.font-body-md` — Inter, 14px/20px, 0em, weight 400
- `.font-body-lg` — Inter, 16px/24px, 0em, weight 400
- `.font-headline-sm` — Inter, 16px/24px, -0.005em, weight 600
- `.font-headline-md` — Inter, 20px/28px, -0.01em, weight 500
- `.font-headline-lg` — Inter, 24px/32px, -0.015em, weight 600
- `.font-headline-xl` — Inter, 32px/40px, -0.02em, weight 600

### 1.5 Material Symbols Icon Helper (lines 79–93)

The `.material-symbols-outlined` class must be ported to `globals.css` for the icon font.

### 1.6 Scrollbar Styles (lines 11–24)

Custom webkit scrollbar styles (6px width, transparent track, semi-transparent thumb).

---

## 2. Font Imports

The new design uses two fonts. These must be added to `client/app/layout.tsx` via `next/font/google`:

| Font | Usage | Source Reference |
|---|---|---|
| **Inter** | Primary sans-serif, all body/headline text | `index.css` line 9, 75 |
| **JetBrains Mono** | Code labels, fingerprints, hex keys, technical readouts | `index.css` line 74, 97–118 |
| **Material Symbols Outlined** | Icon font (replaces current SVG icon system) | `index.css` line 80 |

**Action:** Replace the current font setup in `layout.tsx` with:
```tsx
import { Inter, JetBrains_Mono } from "next/font/google";
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```
And add Material Symbols via `<link>` in the `<head>` or `_document.tsx`.

---

## 3. Component Mapping

### 3.1 New Components → Next.js Equivalents

| # | New Component (Source) | Target Next.js Path | Notes |
|---|---|---|---|
| 1 | `App.tsx` (328 lines) | `client/app/chats/page.tsx` + `client/app/chats/layout.tsx` | Root orchestrator. Split into layout (sidebar + header) and page (view router). |
| 2 | `Sidebar.tsx` (371 lines) | `client/components/Sidebar.tsx` | Direct port. Uses `usePathname` instead of `currentView` state. |
| 3 | `Header.tsx` (78 lines) | `client/components/Header.tsx` | Direct port. Fixed top bar with E2EE badge, TTL, security, profile. |
| 4 | `MessagesView.tsx` (489 lines) | `client/components/MessagesView.tsx` | Conversation list with tabs, search, widgets. Port with new types. |
| 5 | `ChatView.tsx` (681 lines) | `client/components/ChatView.tsx` | Full chat window: messages, input, emoji, attachments, context menu. |
| 6 | `ChannelsView.tsx` (863 lines) | `client/components/ChannelsView.tsx` | Channel list + broadcast dispatcher + create modal. |
| 7 | `VaultModal.tsx` (511 lines) | `client/components/VaultModal.tsx` | Public key display, QR matrix, add contact form, optical scanner. |
| 8 | `SettingsView.tsx` (310 lines) | `client/components/SettingsView.tsx` | Device vault, TTL, onion routing, panic shred. |
| 9 | `SecurityModal.tsx` (123 lines) | `client/components/SecurityModal.tsx` | Safety numbers verification modal. |
| 10 | `CallModal.tsx` (197 lines) | `client/components/CallModal.tsx` | Audio/video call with visualizer, PiP, controls. |
| 11 | `Toast.tsx` (36 lines) | `client/components/Toast.tsx` | Micro toast notifications. |

### 3.2 Type System Mapping

**Source types** (`/tmp/UQZERA-migration/src/types/index.ts`):

| Source Type | Target Equivalent |
|---|---|
| `ViewMode` | Next.js `usePathname()` routing |
| `MessageReaction` | Keep, adapt to `ChatMessage` |
| `Attachment` | Keep, adapt to `MessageAttachment` |
| `Message` | Map to `ChatMessage` in `useChatStore` |
| `Conversation` | Map to `ChatSummary` in `useChatStore` |
| `Broadcast` | New type, add to `useChatStore` |
| `Channel` | New type, add to `useChatStore` |
| `ToastNotification` | New type, add to `useChatStore` |
| `DeviceSession` | New type, add to `useChatStore` |

### 3.3 Data Mapping

**Source data** (`/tmp/UQZERA-migration/src/data/initialData.ts`):

| Source Export | Target |
|---|---|
| `INITIAL_CONVERSATIONS` | Seed data for `useChatStore` chats |
| `INITIAL_ELENA_MESSAGES` | Seed messages for Elena Vance chat |
| `INITIAL_CHANNELS` | Seed channels |
| `INITIAL_DEVICES` | Seed device sessions |

---

## 4. State Management Changes

### 4.1 Current Architecture (Next.js)

- **`useChatStore`** (Zustand): Manages chats, messages, ratchet sessions, transport. Heavy crypto/protocol integration.
- **`useVaultStore`** (Zustand): Manages vault unlock/lock, identity keys, session restore.
- **Local component state**: `useState` for UI-only state (modals, inputs, etc.)

### 4.2 Required Changes

1. **Add new state slices to `useChatStore`:**
   - `channels: Channel[]` + `setChannels`, `addChannel`
   - `devices: DeviceSession[]` + `setDevices`, `removeDevice`
   - `ephemeralTtl: string` + `setEphemeralTtl`
   - `toasts: ToastNotification[]` + `addToast`, `dismissToast`
   - `globalSearch: string` + `setGlobalSearch`

2. **Add new state for modals (can be in `useChatStore` or a new `useUIStore`):**
   - `vaultModalOpen`, `vaultInitialTab`
   - `securityModalOpen`
   - `callModalState: { open, type }`
   - `isMobileSidebarOpen`

3. **View routing:** Replace `currentView` state with Next.js `usePathname()`:
   - `/chats` → MessagesView
   - `/chats/[id]` → ChatView
   - `/chats/channels` → ChannelsView
   - `/settings` → SettingsView

4. **Actions to add to `useChatStore`:**
   - `sendMessage(text: string)` — already exists, adapt signature
   - `addContact(name: string, key: string)` — new
   - `createChannel(channel: Partial<Channel>)` — new
   - `revokeDevice(id: string)` — new
   - `panicShred()` — new
   - `showToast(message, icon?, type?)` — new

---

## 5. New Dependencies

| Package | Purpose | Currently Used? |
|---|---|---|
| `next/font/google` | Font loading (Inter, JetBrains Mono) | Already available in Next.js 14 |
| Material Symbols (CDN link) | Icon font | No — add via `<link>` in layout |
| `zustand` | State management | **Already installed** |
| `clsx` or `tailwind-merge` | Conditional class merging | Check if present; likely needed |

No new npm packages should be required beyond what's already installed. The Material Symbols font is loaded via CDN.

---

## 6. Tailwind Configuration Changes

### 6.1 `client/tailwind.config.ts` — Required Additions

```ts
// Add to theme.extend.colors:
colors: {
  surface: "rgb(var(--color-surface) / <alpha-value>)",
  "surface-dim": "rgb(var(--color-surface-dim) / <alpha-value>)",
  "surface-bright": "rgb(var(--color-surface-bright) / <alpha-value>)",
  "surface-container-lowest": "rgb(var(--color-surface-container-lowest) / <alpha-value>)",
  "surface-container-low": "rgb(var(--color-surface-container-low) / <alpha-value>)",
  "surface-container": "rgb(var(--color-surface-container) / <alpha-value>)",
  "surface-container-high": "rgb(var(--color-surface-container-high) / <alpha-value>)",
  "surface-container-highest": "rgb(var(--color-surface-container-highest) / <alpha-value>)",
  "on-surface": "rgb(var(--color-on-surface) / <alpha-value>)",
  "on-surface-variant": "rgb(var(--color-on-surface-variant) / <alpha-value>)",
  "inverse-surface": "rgb(var(--color-inverse-surface) / <alpha-value>)",
  "inverse-on-surface": "rgb(var(--color-inverse-on-surface) / <alpha-value>)",
  outline: "rgb(var(--color-outline) / <alpha-value>)",
  "outline-variant": "rgb(var(--color-outline-variant) / <alpha-value>)",
  "surface-tint": "rgb(var(--color-surface-tint) / <alpha-value>)",
  primary: "rgb(var(--color-primary) / <alpha-value>)",
  "on-primary": "rgb(var(--color-on-primary) / <alpha-value>)",
  "primary-container": "rgb(var(--color-primary-container) / <alpha-value>)",
  "on-primary-container": "rgb(var(--color-on-primary-container) / <alpha-value>)",
  "inverse-primary": "rgb(var(--color-inverse-primary) / <alpha-value>)",
  secondary: "rgb(var(--color-secondary) / <alpha-value>)",
  "on-secondary": "rgb(var(--color-on-secondary) / <alpha-value>)",
  "secondary-container": "rgb(var(--color-secondary-container) / <alpha-value>)",
  "on-secondary-container": "rgb(var(--color-on-secondary-container) / <alpha-value>)",
  tertiary: "rgb(var(--color-tertiary) / <alpha-value>)",
  "on-tertiary": "rgb(var(--color-on-tertiary) / <alpha-value>)",
  "tertiary-container": "rgb(var(--color-tertiary-container) / <alpha-value>)",
  "on-tertiary-container": "rgb(var(--color-on-tertiary-container) / <alpha-value>)",
  error: "rgb(var(--color-error) / <alpha-value>)",
  "on-error": "rgb(var(--color-on-error) / <alpha-value>)",
  "error-container": "rgb(var(--color-error-container) / <alpha-value>)",
  "on-error-container": "rgb(var(--color-on-error-container) / <alpha-value>)",
  background: "rgb(var(--color-background) / <alpha-value>)",
  "on-background": "rgb(var(--color-on-background) / <alpha-value>)",
  "surface-variant": "rgb(var(--color-surface-variant) / <alpha-value>)",
}

// Add to theme.extend.spacing:
spacing: {
  "space-xs": "var(--spacing-space-xs)",
  "space-sm": "var(--spacing-space-sm)",
  "space-md": "var(--spacing-space-md)",
  "space-lg": "var(--spacing-space-lg)",
  "space-xl": "var(--spacing-space-xl)",
  "margin": "var(--spacing-margin)",
  "margin-mobile": "var(--spacing-margin-mobile)",
  "gutter": "var(--spacing-gutter)",
  "gutter-mobile": "var(--spacing-gutter-mobile)",
}

// Add to theme.extend.fontFamily:
fontFamily: {
  sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
  mono: ["var(--font-mono)", "ui-monospace", "monospace"],
}
```

### 6.2 `client/src/styles/globals.css` — Required Additions

Add the CSS custom properties from Section 1.1–1.3 to `:root`, add the typography classes from Section 1.4, add the Material Symbols helper from Section 1.5, and add the scrollbar styles from Section 1.6.

---

## 7. Step-by-Step Implementation Order

### Phase 1: Foundation (No UI changes, just config)

| Step | Action | File(s) |
|---|---|---|
| 1.1 | Add all CSS custom properties to `:root` in `globals.css` | `client/src/styles/globals.css` |
| 1.2 | Add typography utility classes to `globals.css` | `client/src/styles/globals.css` |
| 1.3 | Add Material Symbols icon helper class to `globals.css` | `client/src/styles/globals.css` |
| 1.4 | Add custom scrollbar styles to `globals.css` | `client/src/styles/globals.css` |
| 1.5 | Update `tailwind.config.ts` with new color, spacing, and font tokens | `client/tailwind.config.ts` |
| 1.6 | Add `next/font/google` imports (Inter + JetBrains Mono) to `layout.tsx` | `client/app/layout.tsx` |
| 1.7 | Add Material Symbols CDN `<link>` to `layout.tsx` or `_document.tsx` | `client/app/layout.tsx` |

### Phase 2: Types & Data

| Step | Action | File(s) |
|---|---|---|
| 2.1 | Add new types (`Channel`, `Broadcast`, `DeviceSession`, `ToastNotification`) to `useChatStore.ts` or a new `types.ts` | `client/store/useChatStore.ts` |
| 2.2 | Add seed data constants (conversations, messages, channels, devices) | `client/store/useChatStore.ts` or new `client/data/seedData.ts` |
| 2.3 | Add new state slices and actions to `useChatStore` | `client/store/useChatStore.ts` |

### Phase 3: Layout Shell

| Step | Action | File(s) |
|---|---|---|
| 3.1 | Port `Sidebar.tsx` → `client/components/Sidebar.tsx` (adapt to `usePathname`) | `client/components/Sidebar.tsx` |
| 3.2 | Port `Header.tsx` → `client/components/Header.tsx` | `client/components/Header.tsx` |
| 3.3 | Port `Toast.tsx` → `client/components/Toast.tsx` | `client/components/Toast.tsx` |
| 3.4 | Update `client/app/chats/layout.tsx` to use new Sidebar + Header | `client/app/chats/layout.tsx` |

### Phase 4: Views (one at a time, test after each)

| Step | Action | File(s) |
|---|---|---|
| 4.1 | Port `MessagesView.tsx` → `client/components/MessagesView.tsx` | `client/components/MessagesView.tsx` |
| 4.2 | Port `ChatView.tsx` → `client/components/ChatView.tsx` | `client/components/ChatView.tsx` |
| 4.3 | Port `ChannelsView.tsx` → `client/components/ChannelsView.tsx` | `client/components/ChannelsView.tsx` |
| 4.4 | Port `SettingsView.tsx` → `client/components/SettingsView.tsx` | `client/components/SettingsView.tsx` |

### Phase 5: Modals

| Step | Action | File(s) |
|---|---|---|
| 5.1 | Port `VaultModal.tsx` → `client/components/VaultModal.tsx` | `client/components/VaultModal.tsx` |
| 5.2 | Port `SecurityModal.tsx` → `client/components/SecurityModal.tsx` | `client/components/SecurityModal.tsx` |
| 5.3 | Port `CallModal.tsx` → `client/components/CallModal.tsx` | `client/components/CallModal.tsx` |

### Phase 6: Integration & Routing

| Step | Action | File(s) |
|---|---|---|
| 6.1 | Wire up view routing in `client/app/chats/page.tsx` using `usePathname` | `client/app/chats/page.tsx` |
| 6.2 | Add modal state management and wire modals into layout | `client/app/chats/layout.tsx` |
| 6.3 | Add toast system integration | `client/app/chats/layout.tsx` |
| 6.4 | Test full flow: sidebar → messages → chat → channels → settings → modals | — |

### Phase 7: Polish

| Step | Action | File(s) |
|---|---|---|
| 7.1 | Verify all `font-*` typography classes work correctly | All components |
| 7.2 | Verify all `bg-surface*`, `text-on-surface*`, `border-surface*` classes work | All components |
| 7.3 | Verify `p-space-*`, `g-space-*`, `gap-space-*` spacing classes work | All components |
| 7.4 | Test mobile responsive behavior (sidebar drawer, backdrop) | `Sidebar.tsx`, `Header.tsx` |
| 7.5 | Test dark/light theme toggle | `Sidebar.tsx` |
| 7.6 | Remove old `UQZERA-*` CSS classes that are no longer needed | `globals.css` |

---

## 8. Key Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Tailwind 4 `@theme` → Tailwind 3 conversion | High — syntax is different | Use CSS custom properties in `:root` + `rgb(var(--token) / <alpha-value>)` pattern |
| `font-headline-sm text-headline-sm` double-class pattern | Medium — source uses both a custom class and a Tailwind class | Port custom classes to `globals.css`, keep Tailwind classes for sizing |
| Material Symbols vs current SVG icon system | High — different API | Replace all `<IconShield>` etc. with `<span className="material-symbols-outlined">shield</span>` |
| `currentView` state → `usePathname()` routing | High — architectural change | Map views to URL paths; use `usePathname()` in layout to conditionally render |
| `ChatView.tsx` is 681 lines | Medium — large file | Port as-is first, then refactor if needed |
| `ChannelsView.tsx` is 863 lines | Medium — large file | Port as-is first, then refactor if needed |
| Next.js `output: 'export'` in `next.config.js` | Medium — static export may limit dynamic routing | Verify that `usePathname` works with static export; may need to use `useRouter` from `next/navigation` with client components |

---

## 9. Files to Create

```
client/
├── components/
│   ├── Sidebar.tsx          (port from source)
│   ├── Header.tsx           (port from source)
│   ├── MessagesView.tsx     (port from source)
│   ├── ChatView.tsx         (port from source)
│   ├── ChannelsView.tsx     (port from source)
│   ├── SettingsView.tsx     (port from source)
│   ├── VaultModal.tsx       (port from source)
│   ├── SecurityModal.tsx    (port from source)
│   ├── CallModal.tsx        (port from source)
│   └── Toast.tsx            (port from source)
├── data/
│   └── seedData.ts          (extracted from initialData.ts)
└── store/
    └── useChatStore.ts      (extended with new state)
```

## 10. Files to Modify

```
client/
├── app/
│   ├── layout.tsx           (add fonts, Material Symbols link)
│   └── chats/
│       ├── layout.tsx       (integrate new Sidebar, Header, Toast)
│       └── page.tsx         (view routing)
├── src/styles/
│   └── globals.css          (add all design tokens, typography, scrollbars)
├── tailwind.config.ts       (add color, spacing, font tokens)
└── store/
    └── useChatStore.ts      (add channels, devices, toasts, modal state)
```

---

## 11. Estimated Effort

| Phase | Effort | Dependencies |
|---|---|---|
| Phase 1: Foundation | 2–3 hours | None |
| Phase 2: Types & Data | 1–2 hours | Phase 1 |
| Phase 3: Layout Shell | 2–3 hours | Phase 1, 2 |
| Phase 4: Views | 6–10 hours | Phase 2, 3 |
| Phase 5: Modals | 3–4 hours | Phase 2, 3 |
| Phase 6: Integration | 2–3 hours | Phase 4, 5 |
| Phase 7: Polish | 2–3 hours | Phase 6 |
| **Total** | **18–28 hours** | — |
