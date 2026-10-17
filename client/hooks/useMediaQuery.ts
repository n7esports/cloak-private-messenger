"use client";

import { useEffect, useState } from "react";

/**
 * Tracks a CSS media query. Used to switch the options menu between a mobile
 * bottom sheet and a desktop popover, and to gate keyboard shortcuts.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True on tablet/desktop widths where a popover is appropriate. */
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
