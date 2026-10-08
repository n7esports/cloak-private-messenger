"use client";

import { motion } from "framer-motion";
import { dotCycle } from "../lib/motion";

export default function TypingDots() {
  return (
    <div
      aria-label="Cloak is typing"
      role="status"
      className="flex w-fit items-center gap-2 rounded-2xl border-l-2 border-cloak-accent bg-cloak-surface1 px-4 py-3"
    >
      {[0, 1, 2].map((index) => (
        <motion.span
          key={index}
          variants={dotCycle(index)}
          initial="initial"
          animate="animate"
          className="h-[1.5px] w-[1.5px] rounded-full bg-cloak-accent"
        />
      ))}
    </div>
  );
}
