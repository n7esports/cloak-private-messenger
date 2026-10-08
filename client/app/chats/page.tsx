"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import KeyExchangeModal from "../../components/modals/KeyExchangeModal";
import NewChatModal from "../../components/modals/NewChatModal";
import { TourOverlay } from "../../components/TourOverlay";
import { getFlag } from "../../lib/flags";
import {
  EPHEMERAL_TIMERS,
  type InnerPayload,
} from "../../lib/protocol";
import {
  PRIVATE_NOTES_CHAT_ID,
  WELCOME_CHAT_ID,
  type ChatSummary,
  useChatStore,
} from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";

const timerLabels = new Map<number, string>([
  [5_000, "5 seconds"],
  [60_000, "1 minute"],
  [3_600_000, "1 hour"],
  [86_400_000, "1 day"],
  [604_800_000, "7 days"],
]);

export default function ChatsPage() {
  const router = useRouter();
  const chats = useChatStore((state) => state.chats);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const messagesMap = useChatStore((state) => state.messagesMap);
  const relayStatus = useChatStore((state) => state.relayStatus);
  const transportError = useChatStore((state) => state.transportError);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const addContact = useChatStore((state) => state.addContact);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const setTyping = useChatStore((state) => state.setTyping);
  const activeTyping = useChatStore(
    (state) =>
      activeChatId !== null && state.typingByChat[activeChatId] === true,
  );
  const lockVault = useVaultStore((state) => state.lockVault);
  const identity = useVaultStore((state) => state.identity);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isKeyExchangeOpen, setIsKeyExchangeOpen] = useState(false);
  const [content, setContent] = useState("");
  const [messageType, setMessageType] =
    useState<InnerPayload["type"]>("text");
  const [ephemeralTimer, setEphemeralTimer] = useState<number | undefined>();
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourError, setTourError] = useState("");

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const visibleMessages = useMemo(
    () =>
      activeChatId
        ? [...(messagesMap[activeChatId] ?? [])].sort(
            (left, right) => left.timestamp - right.timestamp,
          )
        : [],
    [activeChatId, messagesMap],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("compose") === "1") setIsNewChatOpen(true);
    const timer = Number(params.get("timer"));
    if (EPHEMERAL_TIMERS.some((supported) => supported === timer)) {
      setEphemeralTimer(timer);
    }
    if (params.size > 0) window.history.replaceState({}, "", "/chats");
  }, []);

  useEffect(() => {
    let active = true;
    getFlag("tour-completed")
      .then((done) => {
        if (active) setShowTour(!done);
      })
      .catch((cause: unknown) => {
        if (active) {
          setTourError(
            cause instanceof Error
              ? cause.message
              : "Could not check tour completion.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeChatId) setTyping(activeChatId, false);
    return () => {
      if (activeChatId) setTyping(activeChatId, false);
    };
  }, [activeChatId, setTyping]);

  async function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWorking(true);
    try {
      await sendMessage(content, messageType, ephemeralTimer);
      setContent("");
      if (activeChatId) setTyping(activeChatId, false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not encrypt the message.",
      );
    } finally {
      setWorking(false);
    }
  }

  function chooseChat(chatId: string) {
    setActiveChat(chatId);
  }

  function chooseContact(chat: ChatSummary) {
    setActiveChat(chat.id);
    setIsNewChatOpen(false);
    setIsKeyExchangeOpen(false);
    router.replace("/chats");
  }

  return (
    <main className="cloak-app-screen flex bg-cloak-base font-sans text-cloak-text">
      <aside
        aria-label="Conversations"
        className={`${
          activeChatId ? "hidden md:flex" : "flex"
        } w-full shrink-0 flex-col border-r border-cloak-border bg-cloak-surface-1 md:w-80`}
      >
        <header className="flex items-center justify-between border-b border-cloak-border px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cloak-accent">
              Cloak messenger
            </p>
            <h1 className="mt-1 text-lg font-semibold">Conversations</h1>
          </div>
          <button
            type="button"
            data-tour="vault-lock"
            onClick={() => {
              lockVault();
              router.replace("/unlock");
            }}
            className="min-h-11 rounded-lg border border-cloak-border px-3 text-xs transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            Lock
          </button>
        </header>
        <div className="flex items-center justify-between border-b border-cloak-border px-4 py-3">
          <p
            className={`text-xs ${
              relayStatus === "connected"
                ? "text-cloak-accent"
                : "text-cloak-muted"
            }`}
            role="status"
          >
            <span aria-hidden="true">
              {relayStatus === "connected" ? "●" : "○"}
            </span>{" "}
            {relayStatus === "connected"
              ? "Online"
              : relayStatus === "connecting"
                ? "Connecting to relay…"
                : "Offline — messages are queued locally"}
          </p>
          <button
            type="button"
            onClick={() => setIsNewChatOpen(true)}
            className="min-h-11 rounded-lg bg-cloak-accent px-3 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            New chat
          </button>
        </div>
        {transportError && (
          <p role="status" className="border-b border-cloak-border px-4 py-2 text-xs text-cloak-danger">
            {transportError}
          </p>
        )}
        <nav className="flex-1 overflow-y-auto p-2">
          {!chats.some((chat) => chat.kind === "direct") && (
            <p className="m-2 rounded-lg border border-cloak-border px-3 py-3 text-xs leading-5 text-cloak-muted">
              No direct messages yet.{" "}
              <Link
                href="/chats/welcome"
                className="font-medium text-cloak-accent underline underline-offset-2"
              >
                New to Cloak? Open System Guide →
              </Link>
            </p>
          )}
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => chooseChat(chat.id)}
              aria-current={activeChatId === chat.id ? "page" : undefined}
              className={`mb-1 flex min-h-14 w-full items-center justify-between rounded-lg px-3 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cloak-accent ${
                activeChatId === chat.id
                  ? "bg-cloak-surface-2"
                  : "hover:bg-cloak-surface-2/70"
              }`}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 truncate text-sm font-medium">
                  {chat.pinned && (
                    <span aria-label="Pinned" className="text-cloak-accent">
                      ◆
                    </span>
                  )}
                  {chat.alias}
                </span>
                <span className="mt-1 block truncate text-xs text-cloak-muted">
                  {chat.kind === "notes"
                    ? "Encrypted on this device only"
                    : chat.kind === "system"
                      ? "Offline feature walkthrough"
                      : chat.recipientPubKey.slice(0, 18)}
                </span>
              </span>
              {chat.unreadCount > 0 && (
                <span className="ml-2 grid h-6 min-w-6 place-items-center rounded-full bg-cloak-accent px-1 text-xs font-bold text-cloak-base">
                  {chat.unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>
        <footer className="grid grid-cols-3 gap-2 border-t border-cloak-border p-3">
          <Link
            href="/chats/welcome"
            className="flex min-h-11 items-center justify-center rounded-lg border border-cloak-border px-2 text-xs transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            Welcome Guide
          </Link>
          <Link
            href="/chats/notes"
            className="flex min-h-11 items-center justify-center rounded-lg border border-cloak-border px-2 text-xs transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            Private Notes
          </Link>
          <Link
            href="/chats/channels"
            className="flex min-h-11 items-center justify-center rounded-lg border border-cloak-border px-2 text-xs transition hover:bg-cloak-surface-2 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            Channels
          </Link>
        </footer>
      </aside>

      <section
        aria-label={activeChat ? activeChat.alias : "Conversation"}
        className={`${
          activeChatId ? "flex" : "hidden md:flex"
        } min-w-0 flex-1 flex-col`}
      >
        {activeChat ? (
          <>
            <header className="flex items-center gap-3 border-b border-cloak-border bg-cloak-surface-1 px-4 py-4">
              <button
                type="button"
                onClick={() => setActiveChat(null)}
                className="grid h-11 w-11 place-items-center rounded-lg border border-cloak-border text-lg md:hidden"
                aria-label="Back to conversations"
              >
                ←
              </button>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-semibold">{activeChat.alias}</h2>
                <p className="mt-1 truncate font-mono text-xs text-cloak-muted">
                  {activeChat.kind === "notes"
                    ? "local-only"
                    : activeChat.kind === "system"
                      ? "pinned • offline"
                      : activeChat.recipientPubKey.slice(0, 32)}
                </p>
              </div>
            </header>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-8">
              {visibleMessages.map((message) => (
                <article
                  key={message.id}
                  className={`max-w-2xl rounded-2xl px-4 py-3 ${
                    message.outgoing
                      ? "ml-auto rounded-tr-sm bg-cloak-accent/15"
                      : "rounded-tl-sm border border-cloak-border bg-cloak-surface-1"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                    {message.content}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-4 text-xs text-cloak-muted">
                    <time>{new Date(message.timestamp).toLocaleTimeString()}</time>
                    <span>
                      {message.ephemeralTimer !== undefined
                        ? `Burns in ${timerLabels.get(message.ephemeralTimer)} · `
                        : ""}
                      {message.outgoing ? message.status : ""}
                    </span>
                  </div>
                </article>
              ))}
              {visibleMessages.length === 0 && (
                <div className="mx-auto mt-12 max-w-md rounded-xl border border-cloak-border bg-cloak-surface-1 p-6 text-center">
                  <h3 className="font-medium">No messages yet</h3>
                  <p className="mt-2 text-sm leading-6 text-cloak-muted">
                    Messages are encrypted for this contact before they are
                    queued for the relay.
                  </p>
                </div>
              )}
              {activeTyping && (
                <p className="text-xs text-cloak-muted" role="status">
                  Draft in progress…
                </p>
              )}
            </div>
            {activeChat.kind !== "system" && (
              <form
                onSubmit={submitMessage}
                className="border-t border-cloak-border bg-cloak-surface-1 p-3 sm:p-5"
              >
                {activeChat.kind === "direct" && (
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <label
                      htmlFor="message-type"
                      className="text-xs text-cloak-muted"
                    >
                      Content type
                    </label>
                    <select
                      id="message-type"
                      value={messageType}
                      onChange={(event) =>
                        setMessageType(event.target.value as InnerPayload["type"])
                      }
                      className="min-h-10 rounded-md border border-cloak-border bg-cloak-base px-2 text-xs"
                    >
                      <option value="text">Text</option>
                      <option value="image">Image reference</option>
                      <option value="file">File reference</option>
                    </select>
                    <label
                      htmlFor="ephemeral-timer"
                      className="text-xs text-cloak-muted"
                    >
                      Self-destruct
                    </label>
                    <select
                      id="ephemeral-timer"
                      value={ephemeralTimer ?? ""}
                      onChange={(event) =>
                        setEphemeralTimer(
                          event.target.value ? Number(event.target.value) : undefined,
                        )
                      }
                      className="min-h-10 rounded-md border border-cloak-border bg-cloak-base px-2 text-xs"
                    >
                      <option value="">Off</option>
                      {EPHEMERAL_TIMERS.map((timer) => (
                        <option key={timer} value={timer}>
                          {timerLabels.get(timer)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <label htmlFor="chat-message" className="sr-only">
                  Message
                </label>
                <div className="flex items-end gap-2">
                  <textarea
                    id="chat-message"
                    rows={2}
                    required
                    value={content}
                    onChange={(event) => {
                      setContent(event.target.value);
                      setTyping(activeChat.id, event.target.value.length > 0);
                    }}
                    placeholder={
                      activeChat.kind === "notes"
                        ? "Write a private note…"
                        : "Write an encrypted message…"
                    }
                    className="min-h-12 min-w-0 flex-1 resize-y rounded-lg border border-cloak-border bg-cloak-base px-4 py-3 text-sm outline-none focus:border-cloak-accent focus:ring-2 focus:ring-cloak-accent/30"
                  />
                  <button
                    type="submit"
                    disabled={working || !content.trim()}
                    className="min-h-12 rounded-lg bg-cloak-accent px-4 py-3 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
                {error && (
                  <p role="alert" className="mt-2 text-sm text-cloak-danger">
                    {error}
                  </p>
                )}
              </form>
            )}
          </>
        ) : (
          <div className="m-auto max-w-lg px-6 text-center">
            <div
              aria-hidden="true"
              className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-cloak-accent/10 text-2xl text-cloak-accent"
            >
              ◈
            </div>
            <h2 className="text-xl font-semibold">Your private conversations</h2>
            <p className="mt-3 text-sm leading-6 text-cloak-muted">
              Choose a conversation or start with your encrypted, pinned Welcome
              Guide. Messages and notes remain encrypted in this device vault.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/chats/welcome"
                className="flex min-h-11 items-center rounded-lg bg-cloak-accent px-4 py-2 text-sm font-semibold text-cloak-base focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                Open Welcome Guide
              </Link>
              <Link
                href="/chats/notes"
                className="flex min-h-11 items-center rounded-lg border border-cloak-border px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              >
                Open Private Notes
              </Link>
            </div>
          </div>
        )}
      </section>

      {isNewChatOpen && (
        <NewChatModal
          contacts={chats}
          onClose={() => setIsNewChatOpen(false)}
          onContactAdded={addContact}
          onContactSelected={chooseContact}
          onOpenKeyExchange={() => {
            setIsNewChatOpen(false);
            setIsKeyExchangeOpen(true);
          }}
        />
      )}
      {isKeyExchangeOpen && identity && (
        <KeyExchangeModal
          identity={identity}
          onClose={() => setIsKeyExchangeOpen(false)}
          onContactAdded={async (contactAlias, publicKey) => {
            const chat = await addContact(contactAlias, publicKey);
            chooseContact(chat);
            return chat;
          }}
        />
      )}
      {tourError && (
        <p
          role="alert"
          className="fixed bottom-4 left-4 z-50 rounded-lg border border-cloak-danger/50 bg-cloak-surface-1 px-4 py-3 text-sm text-cloak-danger"
        >
          Could not load the guide tour: {tourError}
        </p>
      )}
      {showTour && <TourOverlay onDone={() => setShowTour(false)} />}
    </main>
  );
}
