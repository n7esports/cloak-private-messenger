import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backward-compatible aliases for existing classes
        surface: "var(--bg-base)",
        "surface-dim": "var(--bg-base)",
        "surface-low": "var(--bg-panel)",
        "surface-container": "var(--bg-card)",
        "surface-high": "var(--bg-elevated)",
        "surface-highest": "var(--bg-elevated)",
        "on-surface": "var(--text-primary)",
        "on-surface-variant": "var(--text-secondary)",
        outline: "var(--border-default)",
        "outline-variant": "var(--border-subtle)",
        primary: "var(--accent-emerald)",
        "on-primary": "var(--text-inverse)",
        error: "var(--status-danger)",
        "on-error": "var(--text-inverse)",
        hairline: "var(--border-subtle)",
        // UQZERA color tokens
        "bg-base": "var(--bg-base)",
        "bg-panel": "var(--bg-panel)",
        "bg-card": "var(--bg-card)",
        "bg-elevated": "var(--bg-elevated)",
        "bg-input": "var(--bg-input)",
        "bg-hover": "var(--bg-hover)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-muted": "var(--text-muted)",
        "text-disabled": "var(--text-disabled)",
        "text-inverse": "var(--text-inverse)",
        "border-subtle": "var(--border-subtle)",
        "border-default": "var(--border-default)",
        "border-strong": "var(--border-strong)",
        "border-separator": "var(--border-separator)",
        "accent-emerald": "var(--accent-emerald)",
        "accent-hover": "var(--accent-hover)",
        "accent-soft": "var(--accent-soft)",
        "accent-subtle": "var(--accent-subtle)",
        "status-success": "var(--status-success)",
        "status-warning": "var(--status-warning)",
        "status-danger": "var(--status-danger)",
        "status-info": "var(--status-info)",
        "chat-sent": "var(--chat-sent)",
        "chat-received": "var(--chat-received)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      boxShadow: {
        panel: "var(--shadow-panel)",
      },
      spacing: {
        xs: "var(--space-xs)",
        sm: "var(--space-sm)",
        md: "var(--space-md)",
        lg: "var(--space-lg)",
        xl: "var(--space-xl)",
      },
    },
  },
  plugins: [],
};

export default config;
