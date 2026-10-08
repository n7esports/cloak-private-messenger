"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  WELCOME_CHAT_ID,
  useChatStore,
} from "../../store/useChatStore";

export default function WelcomeGuide() {
  const router = useRouter();
  const messages = useChatStore(
    (state) => state.messagesMap[WELCOME_CHAT_ID] ?? [],
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
      <header className="flex items-center justify-between border-b border-cloak-border bg-cloak-surface-1 px-4 py-4 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cloak-accent">
            Pinned system conversation
          </p>
          <h1 className="mt-1 text-lg font-semibold">Welcome Guide</h1>
        </div>
        <button
          type="button"
          onClick={() => router.push("/chats")}
          className="min-h-11 rounded-lg border border-cloak-border px-4 py-2 text-sm transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
        >
          All chats
        </button>
      </header>

      <section
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
              <Link
                href="/chats?compose=1"
                className="mt-4 min-h-11 rounded-lg bg-cloak-accent px-4 py-2 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                Start Chat
              </Link>
            )}
            {message.id === "welcome-notes" && (
              <Link
                href="/chats/notes"
                className="mt-4 min-h-11 rounded-lg border border-cloak-border px-4 py-2 text-sm font-medium transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                Open Notes
              </Link>
            )}
            {message.id === "welcome-channels" && (
              <Link
                href="/chats/channels"
                className="mt-4 min-h-11 rounded-lg border border-cloak-border px-4 py-2 text-sm font-medium transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                Explore Channels
              </Link>
            )}
            {message.id === "welcome-timers" && (
              <Link
                href="/chats?compose=1&timer=60000"
                className="mt-4 min-h-11 rounded-lg border border-cloak-border px-4 py-2 text-sm font-medium transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                Configure Timers
              </Link>
            )}
            {message.id === "welcome-wipe" && (
              <Link
                href="/unlock"
                className="mt-4 min-h-11 rounded-lg border border-cloak-danger/50 px-4 py-2 text-sm font-medium text-cloak-danger transition hover:bg-cloak-danger/10 focus:outline-none focus:ring-2 focus:ring-cloak-danger"
              >
                Setup Panic Wipe
              </Link>
            )}
          </article>
        ))}
      </section>

    </main>
  );
}
