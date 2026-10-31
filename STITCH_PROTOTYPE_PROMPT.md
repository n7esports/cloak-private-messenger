# Stitch Prototype Prompt: UQZERA Messenger

> **Copy-paste the entire prompt below into Google Stitch (Gemini 2.5 Pro mode) to generate a fully interactive, responsive preview application.**

---

## Prompt for Google Stitch

Build a complete, fully interactive responsive preview application for **UQZERA Messenger** — a privacy-first encrypted messaging app. This is a high-fidelity prototype with 5 distinct screens, glassmorphic design, and full interactivity. Every button, modal, toggle, and interaction must work.

---

## 1. Design System

### 1.1 Color Palette

**Dark Theme (default):**
- Background: `#090d16` (deep dark slate)
- Surface 1 (cards/panels): `rgba(15, 20, 35, 0.7)` with `backdrop-blur-xl`
- Surface 2 (elevated): `rgba(20, 28, 48, 0.8)` with `backdrop-blur-xl`
- Border: `rgba(255, 255, 255, 0.08)`
- Text primary: `#f1f5f9`
- Text secondary: `#94a3b8`
- Text muted: `#64748b`
- Accent (primary): `#10b981` (emerald green)
- Accent hover: `#059669`
- Accent glow: `rgba(16, 185, 129, 0.15)`
- Danger: `#ef4444`
- Warning: `#f59e0b`

**Light Theme (toggled):**
- Background: `#f8fafc` (frosted white)
- Surface 1: `rgba(255, 255, 255, 0.75)` with `backdrop-blur-xl`
- Surface 2: `rgba(255, 255, 255, 0.85)` with `backdrop-blur-xl`
- Border: `rgba(15, 23, 42, 0.08)`
- Text primary: `#0f172a`
- Text secondary: `#475569`
- Text muted: `#94a3b8`
- Accent: `#10b981` (same emerald)

### 1.2 Glassmorphism Classes

Use these exact CSS patterns throughout:

```css
.glass {
  background: rgba(15, 20, 35, 0.7);
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.glass-strong {
  background: rgba(20, 28, 48, 0.85);
  backdrop-filter: blur(32px) saturate(200%);
  -webkit-backdrop-filter: blur(32px) saturate(200%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glass-soft {
  background: rgba(15, 20, 35, 0.4);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
```

For light theme, override with white-based rgba values.

### 1.3 Typography

- Font family: `Inter`, system-ui fallback
- Headings: `font-weight: 600-700`, tight letter-spacing
- Body: `font-size: 14px`, `line-height: 1.5`
- Captions/labels: `font-size: 12px`, `font-weight: 500`, uppercase where appropriate
- Mono (for keys/hex): `font-family: 'JetBrains Mono', 'Fira Code', monospace`

### 1.4 Spacing & Layout

- Base unit: 4px
- Padding scale: 4, 8, 12, 16, 20, 24, 32, 48
- Border radius: 8px (sm), 12px (md), 16px (lg), 24px (xl), 9999px (pill)
- Max content width: 1200px
- Sidebar width: 320px (desktop), full-width overlay (mobile)

### 1.5 Icon Badges (Inline SVG)

Use compact inline SVG icons (Heroicons style, 24x24 viewBox, stroke-based):

**LockClosedIcon:**
```svg
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
</svg>
```

**ShieldCheckIcon:**
```svg
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
</svg>
```

**Other icons needed:** VideoCameraIcon, PhoneIcon, KeyIcon, PaperAirplaneIcon (send), FaceSmileIcon (emoji), PaperClipIcon (attachment), MicrophoneIcon, ChevronDownIcon, PlusIcon, CameraIcon, SunIcon, MoonIcon, ChatBubbleLeftRightIcon, UsersIcon, SignalIcon, XMarkIcon, QrCodeIcon, ArrowPathIcon (refresh), ClockIcon (timer), CheckIcon, EllipsisHorizontalIcon, BellIcon, Cog6ToothIcon, MagnifyingGlassIcon (search).

### 1.6 Theme Toggle

- Toggle button in the top-right of the sidebar header
- Switches `data-theme` attribute on `<html>` element between `"dark"` and `"light"`
- Smooth 300ms transition on all color properties
- Persist preference to `localStorage`

---

## 2. Screen Specifications

The application is a single-page prototype with 5 screens accessible via sidebar navigation. All screens share the same sidebar and top-level layout. The main content area switches based on active navigation item.

### Screen A — Chats List (Default View)

**Layout:**
- Left sidebar (320px on desktop, slide-over on mobile with hamburger toggle)
- Main content area showing the conversation list

**Sidebar Contents (top to bottom):**
1. **App Header** — "UQZERA" wordmark with LockClosedIcon in emerald, theme toggle button (Sun/Moon), settings gear icon
2. **Search Bar** — Rounded input with MagnifyingGlassIcon, placeholder "Search conversations...", glass-soft background
3. **Device Vault Badge** — Small pill/badge with ShieldCheckIcon, text "Device Vault: 3 devices", emerald accent border, glass-soft background
4. **Relay Connected Pill** — Green dot indicator (pulsing animation), text "Relay Connected", subtext "Latency: 23ms", glass-soft background with emerald border
5. **Navigation Items:**
   - Chats (ChatBubbleLeftRightIcon) — active state with emerald left border
   - Channels (UsersIcon)
   - Contacts (UsersIcon or specific contact icon)
   - Settings (Cog6ToothIcon)
6. **Bottom Elevated Glass Trigger** — "Channels" button, full-width, glass-strong background, elevated shadow, emerald accent icon, chevron indicator. Clicking navigates to Screen D.

**Main Content — Chats List:**
- Header: "Messages" title, filter tabs (All, Unread, Groups)
- Conversation list items (scrollable), each showing:
  - Avatar circle with initials (gradient background)
  - Contact name (font-semibold)
  - Message preview (truncated, text-secondary)
  - Timestamp (text-muted, 12px)
  - Unread badge (emerald circle with count, only on unread items)
  - LockClosedIcon badge next to name (small, emerald, indicating encrypted)
  - Hover state: slight background brighten
  - Click: navigates to Screen B with that conversation's data
- Mock data: 8 conversations with realistic names, messages, timestamps, and unread counts

---

### Screen B — Active Encrypted Chat

**Layout:**
- Same sidebar (collapsed or hidden on mobile with back button)
- Main content: full chat view

**Chat Header (glass-strong, sticky top):**
- Left: Back arrow (mobile), avatar, contact name + "Online" status with green dot
- Center/Right action buttons (icon buttons with tooltips, 44px hit targets):
  - VideoCameraIcon — "Video Call"
  - PhoneIcon — "Voice Call"
  - KeyIcon — "Key Details" (opens Screen C modal)
  - EllipsisHorizontalIcon — "More Options" (dropdown menu)

**Messages Area (scrollable, padded):**
- Date separator pills (centered, glass-soft, "Today", "Yesterday")
- Message bubbles:
  - **Sent messages:** Right-aligned, emerald-tinted glass background (`rgba(16, 185, 129, 0.12)`), rounded-2xl with rounded-br-sm
  - **Received messages:** Left-aligned, glass-soft background, rounded-2xl with rounded-bl-sm
  - Each bubble contains: message text, timestamp (10px, muted), delivery status (CheckIcon or double check for read)
  - **Dropdown chevron:** Each message has a small ChevronDownIcon in the top-right corner of the bubble. Clicking reveals a small dropdown menu with: Reply, Forward, Copy, React, Delete (text-red)
  - **Floating reaction bar:** On hover/long-press of any message, a floating reaction bar appears above the bubble with quick emoji reactions (👍 ❤️ 😂 🎉 😮 😢). Clicking adds the reaction below the bubble.
  - Reactions display as small pills below the message bubble with the emoji and count
- Mock data: 12-15 messages with realistic conversation flow, mixed sent/received, some with reactions

**Typing Indicator (conditional):**
- Three bouncing dots animation in a received-style bubble
- Shows "typing..." text below

**Bottom Action Bar (glass-strong, sticky bottom, safe-area padding):**
- **Disappearing Timer Pill:** ClockIcon + "24h" text, glass-soft pill. Clicking cycles through options: Off, 1h, 24h, 7d. Small popover menu.
- **Text Input:** Flex-grow, rounded-xl, glass-soft background, placeholder "Type a message...", auto-resize up to 4 lines
- **Emoji Picker Button:** FaceSmileIcon, click opens a popover grid of common emojis (48 emojis in 6×8 grid), clicking inserts at cursor
- **Attachment Upload:** PaperClipIcon, click opens a small menu: Photo, Document, Camera (mock — clicking shows a toast "Attachment sent")
- **Send Button:** PaperAirplaneIcon, emerald filled circle, disabled when input is empty, enabled with glow when text present
- **Mic Icon:** MicrophoneIcon, appears when input is empty (replaces send button), clicking shows toast "Voice recording started"

---

### Screen C — Key & Contact Exchange Modal

**Trigger:** Clicking KeyIcon in chat header, or a dedicated button.

**Modal Container:**
- Fixed overlay with dimmed backdrop (`rgba(0, 0, 0, 0.5)` + `backdrop-blur-sm`)
- Modal panel: glass-strong, max-width 480px, rounded-2xl, centered with slide-up animation
- Close button (XMarkIcon) in top-right corner
- Portal-rendered to body

**Dual Tabs:**
- Tab bar at top: "My Public Key" | "Add Contact"
- Active tab: emerald text + emerald bottom border
- Inactive tab: text-secondary, hover text-primary
- Tab content switches with fade transition

**Tab 1: My Public Key**
- Title: "My Public Key" with ShieldCheckIcon
- QR Code: Render a realistic-looking QR code pattern (use a canvas-based QR or SVG grid pattern that looks like a real QR — 25×25 grid with finder patterns in corners). The QR should encode the mock public key string.
- Raw Key Display: Below QR, a mono-font text block showing a 256-bit hex string (64 characters), formatted in 4 lines of 16 chars each, with a copy button (copies to clipboard, shows "Copied!" toast)
- Fingerprint: A visual fingerprint representation — 8×4 grid of small squares, some filled emerald, some empty, representing the key fingerprint
- "Share Key" button: emerald filled, shows toast "Key shared securely"
- Mock public key: `a3f7b2d9e4c1f8a5b6d3e7f9c2a4b8d1e5f7a3c6b9d2e4f8a1c3b5d7e9f2a4c6`

**Tab 2: Add Contact**
- Title: "Add Contact" with PlusIcon
- Form fields:
  - **Contact Name** (required): Text input, glass-soft, placeholder "Enter contact name". Validation: must be at least 2 characters. Show error state (red border + error message "Name is required") if empty on submit or < 2 chars.
  - **Public Key** (optional): Text input, mono font, placeholder "Paste contact's public key..."
  - **Camera Scanner Button:** Full-width button with CameraIcon, text "Scan QR Code". Clicking opens a mock scanner view — a viewfinder frame with animated scanning line, and after 2 seconds auto-"detects" a key and fills the Public Key field.
- Submit Button: "Add Contact", emerald filled, disabled until name is valid. On submit: success toast "Contact added successfully!" and modal closes.
- Validation states: red border + error text for invalid, green border + check for valid

---

### Screen D — Channels Screen

**Layout:**
- Same sidebar (Channels nav item is now active)
- Main content: channels list + broadcast preview

**Main Content:**
- Header: "Channels" title, "Create Channel" button (PlusIcon, emerald)
- **Channel List:** Each item shows:
  - Channel avatar (square with rounded corners, gradient background with channel icon)
  - Channel name (font-semibold)
  - Member count (UsersIcon + count)
  - Last activity timestamp
  - **Active state:** `border-l-4 border-emerald-500` with slightly brighter background
  - Hover state: background brighten
  - LockClosedIcon for encrypted channels
- Mock data: 6 channels with realistic names (#general, #security, #design, #engineering, #random, #announcements)

**Channel Broadcast Preview Card (right panel on desktop, below on mobile):**
- Glass-strong card, rounded-2xl
- Channel header: avatar, name, member count
- Last broadcast message preview
- "Broadcast" button (PaperAirplaneIcon, emerald)
- Subscriber avatars row (overlapping circles, +N more)
- Scheduled broadcast indicator if applicable

---

### Screen E — Mobile Action Menus

This screen demonstrates mobile-specific interaction patterns. On desktop, it shows a mobile device frame mockup. On mobile, it IS the mobile experience.

**Top-Right Dropdown Menu:**
- Trigger: EllipsisHorizontalIcon button in a mock chat header
- Menu panel: glass-strong, rounded-xl, `align='end'` (right-aligned to trigger), min-width 200px
- Menu items (each with icon + label, 44px height):
  - Video Camera (VideoCameraIcon)
  - Voice Call (PhoneIcon)
  - Key Details (KeyIcon)
  - Search in Chat (MagnifyingGlassIcon)
  - Mute Notifications (BellIcon)
  - Block Contact (XMarkIcon, red text)
- Animation: scale + fade in from top-right origin
- Backdrop: transparent, click-outside to close

**Long-Press Message Context Menu:**
- Trigger: Long-press (or right-click on desktop) on any message bubble
- Overlay: Full-screen dimmed backdrop (`rgba(0, 0, 0, 0.4)`)
- Context menu: Elevated glass-strong panel, centered or near the message, rounded-2xl, shadow-2xl
- Menu items (icon + label, 48px height):
  - Reply (ChatBubbleLeftRightIcon)
  - React (FaceSmileIcon)
  - Forward (PaperAirplaneIcon)
  - Copy (DocumentIcon)
  - Pin (PinIcon)
  - Delete (TrashIcon, red text)
- Animation: spring pop-in from the message position
- Dismiss: tap anywhere on backdrop

**Implementation Notes for Stitch:**
- Use `onContextMenu` for right-click detection on desktop
- Use `onTouchStart` / `onTouchEnd` with 500ms timer for long-press on mobile
- Both interactions should open the same context menu component
- The context menu should be positioned near the long-pressed message, not centered

---

## 3. Interaction Requirements

### 3.1 Global Interactions

- **Theme Toggle:** Click sun/moon icon → instant theme switch with 300ms CSS transition on all themed properties. Persist to localStorage. On reload, use saved preference (default dark).
- **Sidebar Navigation:** Click any nav item → active state moves (emerald left border + brighter background), main content switches with subtle fade/slide transition.
- **Mobile Responsive:** 
  - Below 768px: sidebar becomes slide-over drawer with hamburger menu trigger
  - Chat header condenses (fewer visible icons, more in dropdown)
  - Bottom action bar maintains 44px+ hit targets
  - Modals go full-screen on very small screens (< 400px)
- **Toast Notifications:** Bottom-center, glass-strong, slide-up animation, auto-dismiss 3 seconds. Used for: copy actions, send confirmations, contact added, attachment sent, etc.

### 3.2 Screen A Interactions

- **Search:** Typing in search filters conversation list in real-time (name or message match)
- **Filter Tabs:** Click All/Unread/Groups filters the list accordingly
- **Conversation Click:** Navigates to Screen B with selected conversation's data
- **Channels Trigger:** Bottom glass button navigates to Screen D

### 3.3 Screen B Interactions

- **Send Message:** Type text → send button activates → click send → message appears in chat with animation → input clears → send button deactivates
- **Emoji Picker:** Click emoji button → popover grid appears → click emoji → inserts at cursor position in input → popover stays open for multiple inserts → click outside to close
- **Attachment Menu:** Click paperclip → menu appears → click option → toast notification → menu closes
- **Message Dropdown:** Click chevron on any message → dropdown appears with options → click option → action executes (copy → toast, delete → message removed with animation, etc.)
- **Reaction Bar:** Hover message → floating reaction bar appears above → click emoji → reaction pill appears below message → click existing reaction pill → increments count or removes if already reacted
- **Timer Pill:** Click → popover with timer options → click option → pill updates → popover closes
- **Typing Indicator:** Show typing indicator for 3 seconds after sending a message (simulating a reply), then show a mock reply message
- **Video/Voice Call Buttons:** Click → toast "Starting encrypted call..." with pulsing animation

### 3.4 Screen C Interactions

- **Tab Switching:** Click tabs → content switches with fade transition
- **Copy Key:** Click copy button → text copies to clipboard → button shows checkmark "Copied!" for 2 seconds → reverts
- **QR Scanner:** Click "Scan QR Code" → mock scanner overlay appears with animated scan line → after 2 seconds, auto-detects and fills key field → scanner closes
- **Form Validation:** Real-time validation as user types — name field shows green check when valid (≥2 chars), red X when invalid
- **Add Contact Submit:** Only enabled when name is valid → click → success animation → toast → modal closes after 500ms

### 3.5 Screen D Interactions

- **Channel Selection:** Click channel → active state moves (emerald border-l-4) → preview card updates with channel data
- **Create Channel:** Click button → toast "Channel creation coming soon in prototype" (or open a simple modal with name input)
- **Broadcast Button:** Click → toast "Broadcast composed and sent to N subscribers"

### 3.6 Screen E Interactions

- **Dropdown Menu:** Click trigger → menu appears aligned to right edge of trigger → click item → action executes → menu closes → click outside → menu closes
- **Long-Press Context Menu:** Long-press message → haptic-like visual feedback (slight scale) → context menu appears elevated above dimmed backdrop → click item → action executes → menu closes → backdrop fades
- **Backdrop Dismiss:** Click/tap outside menu → smooth fade-out dismissal

---

## 4. Technical Constraints

### 4.1 Framework & Stack
- **Next.js 14 App Router** (or single HTML file with React via CDN if Stitch prefers)
- **Tailwind CSS** for all utility styling
- **CSS Custom Properties** for theming (all colors as variables)
- **No external UI libraries** — build all components from scratch
- **Inline SVG** for all icons (no icon library dependency)

### 4.2 Responsive Breakpoints
- Mobile: < 640px (single column, slide-over sidebar, full-screen modals)
- Tablet: 640px – 1024px (narrower sidebar, adjusted spacing)
- Desktop: > 1024px (full sidebar, multi-column layouts)

### 4.3 Accessibility
- All interactive elements: minimum 44×44px hit target
- ARIA labels on all icon-only buttons
- `role="dialog"` and `aria-modal="true"` on modals
- `aria-selected` on tabs and navigation items
- Keyboard navigation: Tab through interactive elements, Escape closes modals/menus
- Focus visible rings: emerald outline
- Color contrast: minimum 4.5:1 for text

### 4.4 Performance
- No external font downloads — use system font stack or Google Fonts CDN
- Minimal re-renders — use React state efficiently
- CSS animations preferred over JavaScript animations
- `backdrop-blur` only on visible glass surfaces (performance consideration)

### 4.5 Animation Specifications
- Theme transition: `transition: background-color 300ms, color 300ms, border-color 300ms`
- Modal entrance: `animation: slideUp 200ms ease-out` (translateY(20px) → translateY(0))
- Modal exit: `animation: fadeOut 150ms ease-in`
- Message entrance: `animation: messageIn 200ms ease-out` (opacity 0→1, translateY(8px)→0)
- Reaction bar: `animation: scaleIn 150ms ease-out` (scale 0.9→1, opacity 0→1)
- Typing dots: `animation: bounce 1.4s infinite` with staggered delays
- Pulsing green dot: `animation: pulse 2s infinite` (box-shadow glow)
- Dropdown menu: `animation: dropdownIn 150ms ease-out` (opacity 0→1, translateY(-4px)→0)

### 4.6 Mock Data Requirements
- 8 conversations with diverse names (mix of personal and group)
- 12-15 messages in the active chat with realistic timestamps
- 6 channels with realistic names and member counts
- 48 common emojis for the picker
- 6 reaction emoji options
- All timestamps should be relative (2m ago, 1h ago, Yesterday, etc.)
- Message content should be realistic conversational text

### 4.7 Code Structure
```
app/
  layout.tsx          — Root layout with theme provider
  page.tsx            — Main prototype page with all screens
  components/
    Sidebar.tsx       — Navigation sidebar
    ChatList.tsx      — Screen A
    ChatView.tsx      — Screen B
    KeyModal.tsx      — Screen C
    Channels.tsx      — Screen D
    MobileMenus.tsx   — Screen E
    Toast.tsx         — Toast notification system
    Icon.tsx          — Inline SVG icon components
  globals.css         — Tailwind + CSS custom properties + animations
```

---

## 5. Output Requirements

Generate a single, self-contained interactive web application that:
1. Loads in dark theme by default
2. Shows Screen A (Chats List) on initial load
3. Has all 5 screens fully navigable and functional
4. Works on mobile (375px), tablet (768px), and desktop (1280px+) viewports
5. Has zero console errors
6. All buttons, toggles, modals, menus, and form validations work
7. Theme toggle switches all colors correctly with smooth transition
8. All mock data is realistic and consistent across screens
9. Animations are smooth and purposeful (not distracting)
10. The overall aesthetic is premium, privacy-focused, and polished

**Generate the complete application now. Do not ask clarifying questions. Build everything specified above.**
