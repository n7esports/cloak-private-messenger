# UQZERA --- Web Color Design System

**Brand direction:** Premium, minimalist, privacy-first\
**Theme:** Obsidian + Emerald\
**Primary tagline:** Private by design.

This document defines the shared color system for the UQZERA public
website, authentication screens, messenger interface, settings, and
security-related pages.

## 1. Brand colors

  ----------------------------------------------------------------------------
  Token                   Hex                          Usage
  ----------------------- ---------------------------- -----------------------
  Primary Emerald         `#10B981`                    Logo, primary buttons,
                                                       active states, key
                                                       accents

  Deep Emerald            `#059669`                    Hover states, selected
                                                       controls

  Soft Emerald            `#34D399`                    Small highlights and
                                                       secondary accents

  Emerald Subtle          `rgba(16, 185, 129, 0.10)`   Subtle selected
                                                       backgrounds
  ----------------------------------------------------------------------------

Emerald is the only primary brand accent. Use it selectively so
important actions and states remain easy to recognize.

## 2. Background colors

  Token      Hex         Usage
  ---------- ----------- -----------------------------
  Base       `#0F131C`   Main application background
  Sidebar    `#141922`   Navigation sidebar
  Panel      `#181C24`   Main panels
  Card       `#1C2028`   Cards and containers
  Elevated   `#222833`   Menus and popovers
  Input      `#141922`   Input backgrounds
  Hover      `#252C36`   Hovered surfaces

## 3. Text colors

  Token       Hex         Usage
  ----------- ----------- ----------------------------------
  Primary     `#E5E7EB`   Headings and important text
  Secondary   `#A7B0BC`   Descriptions and supporting text
  Muted       `#737E8C`   Timestamps, hints, metadata
  Disabled    `#505967`   Disabled text
  Inverse     `#0F131C`   Text on bright buttons

## 4. Borders and dividers

  Token       Hex         Usage
  ----------- ----------- -------------------------------
  Subtle      `#252C36`   Card borders
  Default     `#303946`   Inputs and component borders
  Strong      `#465160`   Focused or emphasized borders
  Separator   `#202630`   Dividers

## 5. Status colors

  Status        Hex         Usage
  ------------- ----------- -----------------------------------------
  Success       `#10B981`   Verified, delivered, successful actions
  Warning       `#F59E0B`   Pending, expiring, attention needed
  Danger        `#EF6464`   Delete, revoke, panic wipe, errors
  Information   `#60A5FA`   Informational messages and help

Status colors are functional only. Do not use them as additional brand
accents.

## 6. Component colors

  -----------------------------------------------------------------------
  Component                           Color
  ----------------------------------- -----------------------------------
  Primary button                      `#10B981`

  Primary button hover                `#059669`

  Primary button text                 `#0F131C`

  Secondary button                    `#1C2028`

  Secondary button border             `#303946`

  Focus ring                          `#10B981`

  Active navigation                   Emerald text with a subtle
                                      emerald-tinted background

  Sent chat bubble                    `#123B31`

  Received chat bubble                `#1C2028`

  Online indicator                    `#10B981`
  -----------------------------------------------------------------------

## 7. CSS design tokens

``` css
:root {
  /* UQZERA Brand */
  --brand-primary: #10B981;
  --brand-hover: #059669;
  --brand-soft: #34D399;
  --brand-subtle: rgba(16, 185, 129, 0.10);

  /* Backgrounds */
  --bg-base: #0F131C;
  --bg-sidebar: #141922;
  --bg-panel: #181C24;
  --bg-card: #1C2028;
  --bg-elevated: #222833;
  --bg-input: #141922;
  --bg-hover: #252C36;

  /* Text */
  --text-primary: #E5E7EB;
  --text-secondary: #A7B0BC;
  --text-muted: #737E8C;
  --text-disabled: #505967;
  --text-inverse: #0F131C;

  /* Borders */
  --border-subtle: #252C36;
  --border-default: #303946;
  --border-strong: #465160;
  --border-separator: #202630;

  /* Status */
  --status-success: #10B981;
  --status-warning: #F59E0B;
  --status-danger: #EF6464;
  --status-info: #60A5FA;

  /* Chat */
  --chat-sent: #123B31;
  --chat-received: #1C2028;

  /* Typography */
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-mono: 'JetBrains Mono', 'Courier New', monospace;

  /* Shape */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 18px;
}
```

## 8. Visual direction

UQZERA should feel calm, confident, precise, and trustworthy.

-   Use flat, layered dark surfaces.
-   Use subtle borders to separate sections.
-   Use emerald only for primary actions, selected states, and
    meaningful security indicators.
-   Keep typography clear and readable.
-   Use consistent spacing based on 8px increments.
-   Use `Inter` for interface typography and `JetBrains Mono` for
    technical labels, keys, and codes.
-   Keep the logo emerald on dark backgrounds; provide a monochrome
    version for contexts where color is unavailable.

## 9. Strict brand rules

-   No gradients.
-   No neon glows or glowing borders.
-   No glassmorphism.
-   No purple or blue as secondary brand accents.
-   No random colorful icons.
-   No pure-white backgrounds or excessive pure-white text.
-   Do not use emerald on every element; preserve it for meaningful
    emphasis.
-   Prefer flat surfaces, subtle borders, and consistent spacing.
-   Do not add decorative shadows unless they materially improve
    hierarchy.
-   Keep the UQZERA logo in its established emerald brand color.

## 10. Implementation guidance

1.  Define these tokens centrally and reuse them across all pages.
2.  Avoid hardcoding color values in individual components when a token
    exists.
3.  Check text and control contrast in every state, including hover,
    focus, disabled, and error states.
4.  Do not communicate security status through color alone; pair status
    colors with clear text or an icon.
5.  Keep destructive actions visually distinct and require appropriate
    confirmation.
6.  Treat this document as the shared source of truth for the UQZERA web
    color theme.

------------------------------------------------------------------------

**UQZERA**\
*Private by design.*
