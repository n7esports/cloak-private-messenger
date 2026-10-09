"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  guideIntro,
  guideOutro,
  guideSections,
  type GuideAction,
} from "../lib/guideContent";
import { IconArrowRight, IconSpark } from "./icons/GuideIcons";

export type GuideIntent = "new-chat" | "key-exchange" | "panic-wipe" | "timer";

interface GuidePanelProps {
  onIntent: (intent: GuideIntent) => void;
  onNavigate: (href: string) => void;
  onClose?: () => void;
}

const valueProps = [
  "No accounts",
  "No phone numbers",
  "End-to-end encrypted",
];

function GuideActionButton({
  action,
  onIntent,
  onNavigate,
}: {
  action: GuideAction;
  onIntent: (intent: GuideIntent) => void;
  onNavigate: (href: string) => void;
}) {
  const base =
    "mt-4 inline-flex min-h-9 items-center gap-1.5 self-start rounded-lg px-3 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-cloak-accent/60";

  if (action.comingSoon) {
    return (
      <span className={`${base} cursor-default border border-cloak-border text-cloak-dim`}>
        {action.label}
      </span>
    );
  }

  const isPrimary = Boolean(action.intent);
  const className = `${base} ${
    isPrimary
      ? "bg-cloak-accent text-cloak-base hover:bg-cloak-accent-hover"
      : "border border-cloak-accent/50 text-cloak-accent hover:bg-cloak-accent/10"
  }`;

  return (
    <button
      type="button"
      onClick={() => {
        if (action.intent) onIntent(action.intent);
        else if (action.href) onNavigate(action.href);
      }}
      className={className}
    >
      {action.label}
      <IconArrowRight className="h-3.5 w-3.5" />
    </button>
  );
}

export default function GuidePanel({ onIntent, onNavigate, onClose }: GuidePanelProps) {
  const reduceMotion = useReducedMotion() ?? false;
  const OutroIcon = guideOutro.icon;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-8">
        <motion.section
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative isolate overflow-hidden rounded-2xl border border-cloak-accent/30 bg-gradient-to-br from-cloak-accent/15 via-cloak-surface-1 to-cloak-surface-1 p-6 sm:p-8"
        >
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 -z-10 h-48 w-48 rounded-full bg-cloak-accent/20 blur-[80px]"
          />
          <div className="flex items-center justify-between gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cloak-accent/40 bg-cloak-accent/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cloak-accent">
              <IconSpark className="h-3.5 w-3.5" />
              Cloak Guide
            </span>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-9 rounded-lg border border-cloak-border px-3 text-xs text-cloak-muted transition hover:bg-cloak-surface-2 md:hidden"
              >
                Close
              </button>
            )}
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
            Everything Cloak can do
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-cloak-muted">
            {guideIntro}
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {valueProps.map((prop) => (
              <li
                key={prop}
                className="rounded-full border border-cloak-border bg-cloak-base/40 px-3 py-1 text-xs text-cloak-text"
              >
                {prop}
              </li>
            ))}
          </ul>
        </motion.section>

        {guideSections.map((section) => (
          <section key={section.heading} className="mt-9">
            <header className="flex items-baseline justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-cloak-text">
                {section.heading}
              </h2>
              <span className="text-xs text-cloak-muted">{section.caption}</span>
            </header>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <article
                    key={item.title}
                    className="group flex flex-col rounded-xl border border-cloak-border bg-cloak-surface-1 p-5 transition hover:border-cloak-accent/50 hover:bg-cloak-surface-2/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cloak-accent/10 text-cloak-accent transition group-hover:bg-cloak-accent/20">
                        <Icon className="h-5 w-5" />
                      </span>
                      <h3 className="text-sm font-semibold text-cloak-text">
                        {item.title}
                      </h3>
                    </div>
                    <p className="mt-3 flex-1 text-sm leading-6 text-cloak-muted">
                      {item.body}
                    </p>
                    {item.action && (
                      <GuideActionButton
                        action={item.action}
                        onIntent={onIntent}
                        onNavigate={onNavigate}
                      />
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <section className="mt-9 flex items-center gap-4 rounded-xl border border-cloak-accent/30 bg-cloak-accent/5 p-5">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-cloak-accent/15 text-cloak-accent">
            <OutroIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-cloak-text">
              {guideOutro.title}
            </h3>
            <p className="mt-1 text-sm leading-6 text-cloak-muted">
              {guideOutro.body}
            </p>
          </div>
          <GuideActionButton
            action={guideOutro.action}
            onIntent={onIntent}
            onNavigate={onNavigate}
          />
        </section>
      </div>
    </div>
  );
}
