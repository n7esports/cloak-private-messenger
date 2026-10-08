import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/pages/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "cloak-base": "#09090b",
        "cloak-surface-1": "#18181b",
        "cloak-surface-2": "#27272a",
        "cloak-border": "#3f3f46",
        "cloak-accent": "#10b981",
        "cloak-accent-hover": "#059669",
        "cloak-text": "#fafafa",
        "cloak-muted": "#a1a1aa",
        "cloak-danger": "#ef4444",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
