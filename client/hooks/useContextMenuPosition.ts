"use client";

import { useCallback, useEffect, useState } from "react";

export interface AnchorRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export interface MenuSize {
  width: number;
  height: number;
}

export type MenuPlacement =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface MenuPosition {
  placement: MenuPlacement;
  top: number;
  left: number;
}

const GAP = 8;
const EDGE = 8;

/**
 * Smart bounds detection for a floating message menu. It prefers opening below
 * the message, flips above when there is not enough room, and flips left/right
 * so the menu never overflows the viewport edges.
 */
export function useContextMenuPosition(
  anchor: AnchorRect | null,
  size: MenuSize,
): MenuPosition | null {
  const [viewport, setViewport] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, []);

  const compute = useCallback((): MenuPosition | null => {
    if (!anchor || viewport.width === 0) return null;
    const { width, height } = size;
    const spaceBelow = viewport.height - anchor.bottom;
    const openBelow = spaceBelow >= height + GAP || anchor.top < height + GAP;
    const placementY: "top" | "bottom" = openBelow ? "bottom" : "top";

    const rawTop = openBelow
      ? anchor.bottom + GAP
      : anchor.top - height - GAP;
    const top = Math.min(
      Math.max(EDGE, rawTop),
      Math.max(EDGE, viewport.height - height - EDGE),
    );

    const fitsRight = anchor.right - width >= EDGE;
    const placementX: "left" | "right" = fitsRight ? "right" : "left";
    const rawLeft = fitsRight ? anchor.right - width : anchor.left;
    const left = Math.min(
      Math.max(EDGE, rawLeft),
      Math.max(EDGE, viewport.width - width - EDGE),
    );

    return {
      placement: `${placementY}-${placementX}` as MenuPlacement,
      top,
      left,
    };
  }, [anchor, size, viewport]);

  const [position, setPosition] = useState<MenuPosition | null>(null);

  useEffect(() => {
    setPosition(compute());
  }, [compute]);

  return position;
}
