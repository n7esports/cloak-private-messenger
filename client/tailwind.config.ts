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
        cloak: {
          bg: "#09090b",
          surface1: "#18181b",
          surface2: "#27272a",
          border: "#3f3f46",
          accent: "#10b981",
          accentHover: "#059669",
          text: "#fafafa",
          muted: "#a1a1aa",
          dim: "#52525b",
          danger: "#ef4444",
        },
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
      borderRadius: {
        card: "16px",
        btn: "12px",
        bubble: "20px",
        input: "10px",
      },
      boxShadow: {
        glow: "0 0 24px rgba(16,185,129,0.4)",
        "glow-sm": "0 0 12px rgba(16,185,129,0.24)",
        "glow-hero": "0 0 50px rgba(16,185,129,0.16)",
      },
      transitionTimingFunction: {
        cloak: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
