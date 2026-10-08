"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useScrolled } from "../../lib/useScrolled";
import {
  WELCOME_CHAT_ID,
  type ChatMessage,
  useChatStore,
} from "../../store/useChatStore";

const EMPTY_MESSAGES: ChatMessage[] = [];

export default function WelcomeGuide() {
  const router = useRouter();
  const scrollerRef = useRef<HTMLElement>(null);
  const scrolled = useScrolled(scrollerRef);
  const [showPanicWipeInfo, setShowPanicWipeInfo] = useState(false);
  const messages = useChatStore(
    (state) => state.messagesMap[WELCOME_CHAT_ID] ?? EMPTY_MESSAGES,
  );
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const orderedMessages = useMemo(
    () => [...messages].sort((left, right) => left.timestamp - right.timestamp),
    [messages],
  );

  useEffect(() => {
    setActiveChat(WELCOME_CHAT_ID);
    return () => setActiveChat(null);
  }, [setActiveChat]);

  return (
    <main className="cloak-app-screen flex flex-col bg-cloak-base font-sans text-cloak-text">
      <header
        className={`sticky top-0 z-10 flex items-center justify-between border-b border-cloak-border px-4 py-4 transition-all duration-300 ease-cloak motion-reduce:transition-none motion-reduce:duration-0 sm:px-8 ${
          scrolled
            ? "backdrop-blur-md bg-cloak-bg/80"
            : "bg-cloak-surface-1"
        }`}
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cloak-accent">
            Pinned system conversation
          </p>
          <h1 className="mt-1 text-lg font-semibold">Welcome Guide</h1>
        </div>
        <Link
          href="/chats"
          className="inline-flex items-center justify-center [-webkit-appearance:button] min-h-11 rounded-lg border border-cloak-border px-4 py-2 text-sm transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
        >
          All chats
        </Link>
      </header>

      <section
        ref={scrollerRef}
        aria-label="Welcome guide messages"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 sm:px-8"
      >
        <div className="rounded-xl border border-cloak-accent/20 bg-cloak-accent/5 px-4 py-3 text-sm leading-6 text-cloak-muted">
          This offline guide is encrypted in your device vault. Follow each
          walkthrough to learn how Cloak keeps your data private.
        </div>
        {orderedMessages.map((message) => (
          <article
            key={message.id}
            className="max-w-2xl rounded-2xl rounded-tl-sm border border-cloak-border bg-cloak-surface-1 px-4 py-4"
          >
            <p className="text-sm leading-6 text-cloak-text">
              {message.content}
            </p>
            {message.id === "welcome-e2ee" && (
              <button
                type="button"
                onClick={() => router.push("/chats/new")}
                className="inline-flex items-center justify-center [-webkit-appearance:button] mt-4 min-h-11 rounded-lg bg-cloak-accent px-4 py-2 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                Start Chat
              </button>
            )}
            {message.id === "welcome-notes" && (
              <button
                type="button"
                onClick={() => router.push("/chats/notes")}
                className="inline-flex items-center justify-center [-webkit-appearance:button] mt-4 min-h-11 rounded-lg border border-cloak-border px-4 py-2 text-sm font-medium transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                Open Notes
              </button>
            )}
            {message.id === "welcome-channels" && (
              <Link
                href="/channels/create"
                className="inline-flex items-center justify-center [-webkit-appearance:button] mt-4 min-h-11 rounded-lg border border-cloak-border px-4 py-2 text-sm font-medium transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                Create a channel
              </Link>
            )}
            {message.id === "welcome-timers" && (
              <Link
                href="/chats?compose=1&timer=60000"
                className="inline-flex items-center justify-center [-webkit-appearance:button] mt-4 min-h-11 rounded-lg border border-cloak-border px-4 py-2 text-sm font-medium transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                Configure Timers
              </Link>
            )}
            {message.id === "welcome-wipe" && (
              <button
                type="button"
                onClick={() => setShowPanicWipeInfo(true)}
                className="inline-flex items-center justify-center [-webkit-appearance:button] mt-4 min-h-11 rounded-lg border border-cloak-danger/50 px-4 py-2 text-sm font-medium text-cloak-danger transition hover:bg-cloak-danger/10 focus:outline-none focus:ring-2 focus:ring-cloak-danger"
              >
                Setup Panic Wipe
              </button>
            )}
          </article>
        ))}
      </section>
      {showPanicWipeInfo && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="guide-panic-wipe-title"
            className="w-full max-w-md rounded-xl border border-cloak-border bg-cloak-surface-1 p-6 shadow-2xl"
          >
            <h2 id="guide-panic-wipe-title" className="text-lg font-semibold">
              Panic Wipe
            </h2>
            <p className="mt-3 text-sm leading-6 text-cloak-muted">
              Panic Wipe erases this device&apos;s local vault. A separate
              duress-passphrase configuration is not available yet. The wipe
              control is on the unlock screen.
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
    </main>
  );
}
