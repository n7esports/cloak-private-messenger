import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: "#09090b",
        zinc: {
          50: "#fafafa",
          100: "#f4f4f5",
          200: "#e4e4e7",
          300: "#d4d4d8",
          400: "#a1a1aa",
          500: "#71717a",
          600: "#52525b",
          700: "#3f3f46",
          800: "#27272a",
          900: "#18181b",
          950: "#09090b",
        },
        crimson: "#dc2626",
        violet: "#7c3aed",
        emerald: "#10b981",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-crimson)", "ui-serif", "Georgia", "serif"],
        mono: ["ui-monospace", "monospace"],
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
      },
    },
  },
  plugins: [],
};

export default config;
