Act as a Principal Mobile & Full-Stack Engineer. Autonomously refactor the application's layout to be mobile-responsive, apply glassmorphism styling, and compile the project into an installable Android APK using Capacitor.

---

### Phase 1: Mobile Responsive Layout & Glassmorphism Fixes

1. **Responsive Viewport & Sidebar Toggle:**
   - Modify the main layout container (`apps/web` or main Page component) to render as a single-column layout on mobile viewports (`< 768px`).
   - Hide the desktop sidebar by default on mobile screens (`hidden md:block w-80`).
   - Render the conversation list full-width on mobile. When a chat is selected, slide to the active chat screen with a back arrow to return to the list.

2. **Glassmorphism UI Polish (Light & Dark Themes):**
   - Main Background: Apply an ambient mesh gradient (`bg-gradient-to-br from-slate-100 via-emerald-50/40 to-teal-100/50 dark:from-gray-950 dark:via-slate-900 dark:to-zinc-950 min-h-screen`).
   - Cards & Modals: Style center cards and modals with frosted glass classes (`bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl border border-white/60 dark:border-white/10 shadow-xl rounded-2xl`).
   - Action Buttons: Style secondary buttons ("Open guide", "Channels") with glass pill styling (`bg-white/70 hover:bg-white/90 dark:bg-gray-800/70 backdrop-blur-sm border border-slate-200/70 dark:border-gray-700/70 text-slate-700 dark:text-gray-200`).

3. **Passcode Activation Behavior:**
   - Ensure the vault lock / passcode modal does NOT trigger automatically on app startup.
   - Require passcode prompt ONLY when the user manually taps the Key/Lock icon in the top header.

---

### Phase 2: Next.js Static Export Setup

Update `next.config.js` (or `next.config.mjs`) for native WebView compilation:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

module.exports = nextConfig;