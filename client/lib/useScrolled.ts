"use client";

import { useEffect, useState } from "react";
import type { RefObject } from "react";

export function useScrolled(
  target?: RefObject<HTMLElement>,
  threshold = 8,
): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const element = target?.current ?? window;
    const read = () => {
      const position =
        element instanceof HTMLElement ? element.scrollTop : window.scrollY;
      setScrolled(position > threshold);
    };

    read();
    element.addEventListener("scroll", read, { passive: true });
    return () => element.removeEventListener("scroll", read);
  }, [target, threshold]);

  return scrolled;
}
