"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  startChatServices,
  WELCOME_CHAT_ID,
  useChatStore,
} from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";

export default function ChatsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const sessionRestored = useVaultStore((state) => state.sessionRestored);
  const restoreSession = useVaultStore((state) => state.restoreSession);
  const lockVault = useVaultStore((state) => state.lockVault);
  const chats = useChatStore((state) => state.chats);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const loadChats = useChatStore((state) => state.loadChats);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionRestored) {
      void restoreSession().catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not restore the current-tab vault session.",
        );
      });
      return undefined;
    }
    if (!isUnlocked) {
      router.replace("/unlock");
      return undefined;
    }

    let active = true;
    let stopTransport: (() => void) | undefined;
    loadChats()
      .then(() => {
        if (active) stopTransport = startChatServices();
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load encrypted conversations.",
          );
        }
      });
    return () => {
      active = false;
      stopTransport?.();
    };
  }, [isUnlocked, loadChats, restoreSession, router, sessionRestored]);

  if (!sessionRestored || !isUnlocked) return null;
  if (error) {
    return (
      <main className="cloak-app-screen grid place-items-center bg-cloak-base px-6 text-cloak-text">
        <p role="alert" className="max-w-lg text-center text-sm text-cloak-danger">
          {error}
        </p>
      </main>
    );
  }
  if (pathname === "/chats") return children;
  return (
    <div className="cloak-app-screen flex bg-cloak-base font-sans text-cloak-text">
      <aside
        aria-label="Cloak navigation"
        className="hidden w-80 shrink-0 flex-col border-r border-cloak-border bg-cloak-surface-1 md:flex lg:w-96"
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
        <nav className="flex-1 overflow-y-auto p-3">
          <Link
            href="/chats"
            className="mb-2 flex min-h-11 items-center rounded-lg border border-cloak-border px-3 text-sm hover:bg-cloak-surface-2"
          >
            Direct messages
          </Link>
          {chats
            .filter((chat) => chat.kind === "direct")
            .map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => {
                  setActiveChat(chat.id);
                  router.push("/chats");
                }}
                className="mb-1 flex min-h-12 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-cloak-surface-2"
              >
                {chat.alias}
              </button>
            ))}
          <Link
            href="/chats/welcome"
            className={`mb-1 flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-cloak-surface-2 ${
              pathname === "/chats/welcome" ? "bg-cloak-surface-2" : ""
            }`}
          >
            {chats.find((chat) => chat.id === WELCOME_CHAT_ID)?.alias ??
              "Welcome Guide"}
          </Link>
          <Link
            href="/chats/notes"
            className={`mb-1 flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-cloak-surface-2 ${
              pathname === "/chats/notes" ? "bg-cloak-surface-2" : ""
            }`}
          >
            Private Notes
          </Link>
          <Link
            href="/chats/channels"
            className={`mb-1 flex min-h-11 items-center rounded-lg px-3 text-sm hover:bg-cloak-surface-2 ${
              pathname === "/chats/channels" ? "bg-cloak-surface-2" : ""
            }`}
          >
            Channels
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
