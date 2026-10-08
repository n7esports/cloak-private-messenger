import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import type { GuideItem } from "../lib/guideContent";
import GuideIconBadge from "./GuideIconBadge";

export default function GuideBubble({ item }: { item: GuideItem }) {
  const [comingSoonMessage, setComingSoonMessage] = useState(false);
  const Icon = item.icon;
  const actionClassName =
    "mt-3.5 inline-flex h-8 items-center justify-center rounded-[12px] border border-cloak-accent px-3 py-1.5 text-xs font-medium text-cloak-accent transition-colors hover:bg-cloak-accent hover:text-cloak-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloak-accent/60";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="mr-auto max-w-[85%] rounded-[20px] border-l-2 border-cloak-accent bg-cloak-surface1 p-4"
    >
      {Icon || item.title ? (
        <div className="flex gap-3.5">
          {Icon && (
            <GuideIconBadge>
              <Icon />
            </GuideIconBadge>
          )}
          <div className="min-w-0 flex-1 pt-0.5">
            {item.title && (
              <h3 className="text-[15px] font-semibold leading-tight text-cloak-text">
                {item.title}
              </h3>
            )}
            <p
              className={
                item.title
                  ? "mt-1.5 text-sm leading-relaxed text-cloak-muted"
                  : "text-sm leading-relaxed text-cloak-muted"
              }
            >
              {item.body}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-cloak-muted">{item.body}</p>
      )}

      {item.action &&
        (item.action.comingSoon ? (
          <button
            type="button"
            data-coming-soon={item.action.href}
            onClick={() => setComingSoonMessage(true)}
            className={actionClassName}
          >
            {item.action.label}
          </button>
        ) : (
          <Link href={item.action.href} className={actionClassName}>
            {item.action.label}
          </Link>
        ))}
      {comingSoonMessage && (
        <p role="status" className="mt-2 text-xs text-cloak-muted">
          This feature isn&apos;t available yet.
        </p>
      )}
    </motion.div>
  );
}
