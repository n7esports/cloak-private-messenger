import type { Variants } from "framer-motion";

export const ease = [0.22, 1, 0.36, 1] as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export const fadeUpFast: Variants = {
  hidden: { opacity: 0, y: 8, transition: { duration: 0.18 } },
  show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

export const heroReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export function cascade(index: number, step = 0.15): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        delayChildren: index * step,
        staggerChildren: step,
      },
    },
  };
}

export function wordCascade(index: number): Variants {
  return {
    hidden: { opacity: 0, y: 4 },
    show: {
      opacity: 1,
      y: 0,
      transition: { delay: index * 0.03, duration: 0.18, ease },
    },
  };
}

export const pulse: Variants = {
  initial: { scale: 1, opacity: 0.7 },
  animate: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: { duration: 1.2, repeat: Infinity, ease },
  },
};

export const heroGlow: Variants = {
  initial: { opacity: 0.55, scale: 0.88 },
  animate: {
    opacity: [0.55, 1, 0.55],
    scale: [0.88, 1.12, 0.88],
    transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
  },
};

export const shake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -8, 8, -6, 6, 0],
    transition: { duration: 0.4 },
  },
};

export function dotCycle(index: number): Variants {
  return {
    initial: { opacity: 0.3 },
    animate: {
      opacity: [0.3, 1, 0.3],
      transition: {
        duration: 1.2,
        delay: index * 0.2,
        repeat: Infinity,
        ease: "easeInOut",
      },
    },
  };
}
