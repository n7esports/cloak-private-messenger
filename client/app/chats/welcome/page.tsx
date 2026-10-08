"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import GuideBubble from "../../../components/GuideBubble";
import { guideContent } from "../../../lib/guideContent";
import { useScrolled } from "../../../lib/useScrolled";

export default function WelcomePage() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolled(scrollerRef);
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <main className="cloak-app-screen flex flex-col bg-cloak-bg font-sans text-cloak-text">
      <header
        className={`sticky top-0 z-10 flex items-center justify-between border-b border-cloak-surface1 px-5 py-3.5 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          scrolled ? "backdrop-blur-md bg-cloak-bg/80" : "bg-cloak-bg"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Cloak Guide</span>
          <span className="rounded border border-cloak-accent/40 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-cloak-accent">
            Pinned
          </span>
        </div>
        <span className="text-xs text-cloak-muted">Locked</span>
      </header>

      <div
        ref={scrollerRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-5"
      >
        {guideContent.map((item, index) => (
          <motion.div
            key={`${item.title ?? "intro"}-${index}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.12, duration: 0.3, ease }}
          >
            <GuideBubble item={item} />
          </motion.div>
        ))}
      </div>

      <footer className="border-t border-cloak-surface1 px-4 py-3">
        <input
          type="text"
          disabled
          placeholder="Read-only. The Guide doesn't reply."
          aria-label="Guide reply"
          className="w-full rounded-[10px] border border-cloak-surface2 bg-cloak-surface1 px-4 py-2.5 text-sm text-cloak-dim outline-none"
        />
      </footer>
    </main>
  );
}
