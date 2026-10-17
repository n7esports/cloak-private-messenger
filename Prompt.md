Act as a Principal Frontend Engineer. Fix the invisible text/contrast bug in `MessagesView.tsx`, make the layout fully mobile responsive, and revert the global typography settings back to the original clean font stack:

---

### 1. Revert to Original Font Theme
- In `client/app/globals.css` and `client/app/layout.tsx`:
  - Revert the primary font stack to the original standard Inter / system UI font setup:
    `font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;`
  - Ensure custom CSS variables or Material 3 font classes do not force dark or low-contrast inherited text colors onto headings and list items.

---

### 2. Direct Technical Fixes (`MessagesView.tsx`)
- Locate the rendering loop for `filteredConversations` in `MessagesView.tsx` and apply explicit contrast overrides:
  - **Contact / Conversation Name:**
    ```tsx
    <span className="font-semibold text-base !text-white dark:!text-white truncate">
      {conv.name}
    </span>
    ```
  - **Last Message Preview:**
    ```tsx
    <span className="text-sm !text-slate-300 dark:!text-slate-300 truncate">
      {conv.lastMessage}
    </span>
    ```
  - **Card Backgrounds:**
    ```tsx
    className="group relative flex items-center gap-4 p-4 rounded-2xl bg-[#1c1f29] hover:bg-[#262a34] border border-slate-700/50 shadow-md cursor-pointer transition-all"
    ```
- **Filter Tabs (`All Encrypted`, `Unread`, `Mesh Channels`):**
  - Active Tab: `bg-[#262a34] !text-[#4edea3] font-semibold shadow-sm`
  - Inactive Tabs: `!text-slate-300 hover:!text-white hover:bg-[#1c1f29]`

---

### 3. Ensure 100% Mobile Responsiveness (< 768px)
- **Grid Layout:** Ensure the main outer wrapper uses `grid-cols-1 lg:grid-cols-12 gap-4` so the right-side widgets ("Cryptographic Health", "Auto-Burn Protocol", "Relay Swarm Status") stack neatly below the main chat list on smaller screens.
- **Filter Tabs Bar:** Enable smooth horizontal scrolling on mobile without clipping:
  `flex items-center gap-1 overflow-x-auto no-scrollbar pb-1 sm:pb-0`
- **Action Header:** Stack search filters and the "New Session" button vertically on mobile viewports (`flex-col sm:flex-row sm:items-center justify-between gap-3`).

---

### Deliverables:
1. Revert global typography back to the original font theme.
2. Contact names and previews render with crisp, high-contrast text (`!text-white` and `!text-slate-300`).
3. Layout renders cleanly on both desktop and mobile viewports.
4. Verify `npm run build` passes cleanly inside `client/`.