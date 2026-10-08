import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import type { GuideItem } from "../lib/guideContent";
import GuideIconBadge from "./GuideIconBadge";

export default function GuideBubble({ item }: { item: GuideItem }) {
  const router = useRouter();
  const [showPanicWipeInfo, setShowPanicWipeInfo] = useState(false);
  const Icon = item.icon;
  const actionClassName =
    "mt-3.5 inline-flex h-8 items-center justify-center rounded-[12px] border border-cloak-accent px-3 py-1.5 text-xs font-medium text-cloak-accent transition-colors hover:bg-cloak-accent hover:text-cloak-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cloak-accent/60";

  function followAction() {
    if (!item.action) return;
    if (item.action.href === "/settings/duress") {
      setShowPanicWipeInfo(true);
      return;
    }
    const routes: Record<string, string> = {
      "/chats/new": "/chats/new",
      "/notes": "/chats/notes",
      "/channels/new": "/channels/create",
      "/settings/timer": "/chats?compose=1&timer=60000",
    };
    router.push(routes[item.action.href] ?? item.action.href);
  }

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
        (item.action.comingSoon || item.action.href === "/settings/duress" ? (
          <button
            type="button"
            onClick={followAction}
            className={actionClassName}
          >
            {item.action.label}
          </button>
        ) : (
          <Link href={item.action.href} className={actionClassName}>
            {item.action.label}
          </Link>
        ))}
      {showPanicWipeInfo && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowPanicWipeInfo(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="panic-wipe-title"
            className="w-full max-w-md rounded-xl border border-cloak-border bg-cloak-surface-1 p-6 shadow-2xl"
          >
            <h2 id="panic-wipe-title" className="text-lg font-semibold">
              Panic Wipe
            </h2>
            <p className="mt-3 text-sm leading-6 text-cloak-muted">
              Panic Wipe immediately erases this device&apos;s local vault.
              Cloak does not currently configure a separate duress passphrase.
              You can access the destructive wipe control from the unlock
              screen.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowPanicWipeInfo(false)}
                className="min-h-11 rounded-lg border border-cloak-border px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => router.push("/unlock")}
                className="min-h-11 rounded-lg bg-cloak-danger px-4 text-sm font-semibold text-white"
              >
                Open unlock screen
              </button>
            </div>
          </section>
        </div>
      )}
    </motion.div>
  );
}
