"use client";

import { useEffect, useState } from "react";

const THEME_KEY = "cloak.settings.theme";
const FONT_KEY = "cloak.settings.fontSize";

type Theme = "obsidian" | "darker";
type FontSize = "sm" | "md" | "lg";

const THEMES: { value: Theme; label: string }[] = [
  { value: "obsidian", label: "Obsidian" },
  { value: "darker", label: "Darker" },
];

const FONT_SIZES: { value: FontSize; label: string }[] = [
  { value: "sm", label: "Small" },
  { value: "md", label: "Medium" },
  { value: "lg", label: "Large" },
];

export default function AppearanceSettings() {
  const [theme, setTheme] = useState<Theme>("obsidian");
  const [fontSize, setFontSize] = useState<FontSize>("md");

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (storedTheme) setTheme(storedTheme);
    const storedFont = localStorage.getItem(FONT_KEY) as FontSize | null;
    if (storedFont) setFontSize(storedFont);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(FONT_KEY, fontSize);
    document.documentElement.setAttribute("data-font-size", fontSize);
  }, [fontSize]);

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
        <h2 className="text-sm font-semibold text-on-surface">Theme</h2>
        <p className="mt-1 text-xs text-outline">Choose the base darkness level.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {THEMES.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                theme === t.value
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface-container/60 text-on-surface-variant hover:border-outline-variant"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-outline-variant/50 bg-surface-container/60 p-4">
        <h2 className="text-sm font-semibold text-on-surface">Font Size</h2>
        <p className="mt-1 text-xs text-outline">Adjust the base text size.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {FONT_SIZES.map((f) => (
            <button
              key={f.value}
              onClick={() => setFontSize(f.value)}
              className={`rounded-xl border px-3 py-1.5 text-xs transition ${
                fontSize === f.value
                  ? "border-primary bg-primary text-on-primary"
                  : "border-outline-variant bg-surface-container/60 text-on-surface-variant hover:border-outline-variant"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
