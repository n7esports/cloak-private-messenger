"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  PRIVATE_NOTES_CHAT_ID,
  useChatStore,
} from "../../../store/useChatStore";

export default function PrivateNotesPage() {
  const chats = useChatStore((state) => state.chats);
  const messages = useChatStore(
    (state) => state.messagesMap[PRIVATE_NOTES_CHAT_ID] ?? [],
  );
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (chats.some((chat) => chat.id === PRIVATE_NOTES_CHAT_ID)) {
      setActiveChat(PRIVATE_NOTES_CHAT_ID);
    }
    return () => setActiveChat(null);
  }, [chats, setActiveChat]);

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      await sendMessage(content, "text");
      setContent("");
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not encrypt this note.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="cloak-app-screen flex flex-col bg-cloak-base font-sans text-cloak-text">
      <header className="flex items-center justify-between border-b border-cloak-border bg-cloak-surface-1 px-4 py-4 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cloak-accent">
            Device-only encrypted thread
          </p>
          <h1 className="mt-1 text-lg font-semibold">Private Notes</h1>
        </div>
        <Link
          href="/chats"
          className="flex min-h-11 items-center rounded-lg border border-cloak-border px-4 py-2 text-sm transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
        >
          All chats
        </Link>
      </header>
      <section
        aria-label="Private notes"
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-4 py-6 sm:px-8"
      >
        <p className="mb-2 text-sm leading-6 text-cloak-muted">
          Notes are encrypted with your vault key and never enter the relay
          transport.
        </p>
        {messages.map((message) => (
          <article
            key={message.id}
            className="rounded-xl border border-cloak-border bg-cloak-surface-1 px-4 py-3"
          >
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
              {message.content}
            </p>
            <time className="mt-2 block text-xs text-cloak-muted">
              {new Date(message.timestamp).toLocaleString()}
            </time>
          </article>
        ))}
        {messages.length === 0 && (
          <div className="rounded-xl border border-cloak-border bg-cloak-surface-1 p-5 text-center">
            <p className="text-sm text-cloak-muted">Your private notes are empty.</p>
            <Link
              href="/chats/welcome"
              className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-cloak-accent underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            >
              New to Cloak? Open System Guide →
            </Link>
          </div>
        )}
      </section>
      <form
        onSubmit={saveNote}
        className="mx-auto w-full max-w-3xl border-t border-cloak-border px-4 py-4 sm:px-8"
      >
        <label htmlFor="private-note" className="sr-only">
          New private note
        </label>
        <textarea
          id="private-note"
          rows={3}
          required
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write a private note…"
          className="w-full resize-y rounded-lg border border-cloak-border bg-cloak-surface-1 px-4 py-3 text-sm outline-none focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
        />
        {error && (
          <p role="alert" className="mt-2 text-sm text-cloak-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={saving || !content.trim()}
          className="mt-3 min-h-11 rounded-lg bg-cloak-accent px-4 py-2 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:opacity-50"
        >
          {saving ? "Encrypting…" : "Save note"}
        </button>
      </form>
    </main>
  );
}
