"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { IconChevronLeft, IconNote, IconShield } from "../../../components/icons/UiIcons";
import { AttachmentView } from "../../../components/AttachmentView";
import {
  PRIVATE_NOTES_CHAT_ID,
  type ChatMessage,
  useChatStore,
} from "../../../store/useChatStore";

const EMPTY_MESSAGES: ChatMessage[] = [];

export default function PrivateNotesPage() {
  const chats = useChatStore((state) => state.chats);
  const messages = useChatStore(
    (state) => state.messagesMap[PRIVATE_NOTES_CHAT_ID] ?? EMPTY_MESSAGES,
  );
  const hasNotesChat = chats.some((chat) => chat.id === PRIVATE_NOTES_CHAT_ID);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const ensurePrivateNotes = useChatStore((state) => state.ensurePrivateNotes);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(hasNotesChat);

  useEffect(() => {
    let active = true;
    // The notes thread is a real, encrypted chat row. Create it on demand so
    // saving a note never fails with "select a conversation first".
    ensurePrivateNotes()
      .then(() => {
        if (active) setReady(true);
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not prepare the private notes vault.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [ensurePrivateNotes]);

  useEffect(() => {
    if (hasNotesChat) {
      setActiveChat(PRIVATE_NOTES_CHAT_ID);
    }
    return () => setActiveChat(null);
  }, [hasNotesChat, setActiveChat]);

  async function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      if (!hasNotesChat) {
        await ensurePrivateNotes();
      }
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
    <main className="cloak-ambient cloak-app-screen flex flex-col font-sans text-cloak-text">
      <header className="cloak-glass flex items-center gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/chats"
          className="cloak-glass-soft grid h-10 w-10 place-items-center rounded-xl md:hidden"
          aria-label="Back to conversations"
        >
          <IconChevronLeft className="h-5 w-5" />
        </Link>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-cloak-accent/30 bg-cloak-accent/10 text-cloak-accent">
          <IconNote className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">Private Notes</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-cloak-muted">
            <IconShield className="h-3.5 w-3.5 text-cloak-accent" />
            Encrypted on this device
          </p>
        </div>
        <Link
          href="/chats"
          className="cloak-glass-soft hidden min-h-10 rounded-xl px-4 text-sm text-cloak-muted transition hover:text-cloak-text md:inline-flex md:items-center"
        >
          All chats
        </Link>
      </header>

      <section
        aria-label="Private notes"
        className="cloak-scroll mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-y-auto px-4 py-6 sm:px-8"
      >
        {messages.map((message) => (
          <article key={message.id} className="flex justify-end">
            <div className="cloak-glass-soft min-w-[4.5rem] max-w-[78%] rounded-2xl rounded-br-md px-4 py-2.5">
              {message.attachment && (
                <div className={message.content ? "mb-2" : ""}>
                  <AttachmentView attachment={message.attachment} />
                </div>
              )}
              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                {message.content}
              </p>
              <time className="mt-1.5 block text-right text-[11px] text-cloak-muted">
                {new Date(message.timestamp).toLocaleString()}
              </time>
            </div>
          </article>
        ))}
        {messages.length === 0 && (
          <div className="cloak-glass mx-auto mt-10 max-w-md rounded-2xl p-6 text-center">
            <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-cloak-accent/10 text-cloak-accent">
              <IconNote className="h-6 w-6" />
            </span>
            <h2 className="text-sm font-semibold">Your private notes</h2>
            <p className="mt-2 text-sm leading-6 text-cloak-muted">
              Notes are encrypted with your vault key and never touch the relay.
            </p>
          </div>
        )}
      </section>

      <div className="px-3 pb-3 sm:px-6 sm:pb-5">
        <form onSubmit={saveNote} className="cloak-glass mx-auto w-full max-w-3xl rounded-2xl p-2">
          <label htmlFor="private-note" className="sr-only">
            New private note
          </label>
          <textarea
            id="private-note"
            rows={2}
            required
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (content.trim() && ready && !saving) {
                  event.currentTarget.form?.requestSubmit();
                }
              }
            }}
            placeholder="Write a private note…"
            className="cloak-scroll max-h-40 w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-cloak-dim"
          />
          <div className="flex items-center justify-end px-1 pt-1">
            <button
              type="submit"
              disabled={saving || !ready || !content.trim()}
              className="min-h-10 rounded-xl bg-cloak-accent px-5 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {saving ? "Encrypting…" : "Save note"}
            </button>
          </div>
        </form>
        {error && (
          <p role="alert" className="mx-auto mt-2 max-w-3xl px-2 text-xs text-cloak-danger">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

