"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  startChatServices,
  useChatStore,
} from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import {
  IconBook,
  IconBroadcast,
  IconKey,
  IconNote,
  IconShield,
} from "../../components/icons/UiIcons";

export default function ChatsLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const sessionRestored = useVaultStore((state) => state.sessionRestored);
  const initializeVault = useVaultStore((state) => state.initializeVault);
  const lockVault = useVaultStore((state) => state.lockVault);
  const chats = useChatStore((state) => state.chats);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const loadChats = useChatStore((state) => state.loadChats);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!sessionRestored) {
      void initializeVault().catch((cause: unknown) => {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not open the device vault.",
        );
      });
      return undefined;
    }
    if (!isUnlocked) {
      router.replace("/lock");
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
  }, [initializeVault, isUnlocked, loadChats, router, sessionRestored]);

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

  const directChats = chats.filter((chat) => chat.kind === "direct");
  const notesChat = chats.find((chat) => chat.kind === "notes");

  return (
    <div className="cloak-ambient cloak-app-screen flex font-sans text-cloak-text">
      <aside
        aria-label="Cloak navigation"
        className="cloak-glass-strong hidden w-80 shrink-0 flex-col border-r border-white/5 md:flex lg:w-96"
      >
        <header className="flex items-center justify-between px-4 pb-3 pt-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl border border-cloak-accent/30 bg-cloak-accent/10 text-cloak-accent">
              <IconShield className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cloak-accent">
                Cloak
              </p>
              <h1 className="text-sm font-semibold leading-tight">Conversations</h1>
            </div>
          </div>
          <button
            type="button"
            data-tour="vault-lock"
            onClick={() => {
              lockVault();
              router.replace("/lock");
            }}
            className="cloak-glass-soft grid h-9 w-9 place-items-center rounded-xl text-cloak-muted transition hover:text-cloak-text"
            aria-label="Lock vault"
            title="Lock vault"
          >
            <IconKey className="h-4 w-4" />
          </button>
        </header>

        <div className="flex items-center gap-2 px-4 pb-3">
          <Link
            href="/chats?compose=1"
            className="flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-cloak-accent px-3 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            New chat
          </Link>
          <Link
            href="/chats?guide=1"
            className="cloak-glass-soft grid h-10 w-10 place-items-center rounded-xl text-cloak-muted transition hover:text-cloak-text"
            aria-label="Open guide"
            title="Guide"
          >
            <IconBook className="h-4 w-4" />
          </Link>
        </div>

        <nav className="cloak-scroll flex-1 overflow-y-auto px-2 pb-2">
          <Link
            href="/chats"
            className="mb-1 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text"
          >
            <IconChatList />
            All chats
          </Link>
          {notesChat && (
            <Link
              href="/chats/notes"
              className={`mb-1 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm transition hover:bg-white/5 hover:text-cloak-text ${
                pathname === "/chats/notes"
                  ? "cloak-glass-soft text-cloak-text"
                  : "text-cloak-muted"
              }`}
            >
              <IconNote className="h-4 w-4" />
              {notesChat.alias}
            </Link>
          )}
          {directChats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => {
                setActiveChat(chat.id);
                router.push("/chats");
              }}
              className="mb-1 flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text"
            >
              {chat.alias}
            </button>
          ))}
          <Link
            href="/chats/channels"
            className={`mb-1 flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm transition hover:bg-white/5 hover:text-cloak-text ${
              pathname === "/chats/channels"
                ? "cloak-glass-soft text-cloak-text"
                : "text-cloak-muted"
            }`}
          >
            <IconBroadcast className="h-4 w-4" />
            Channels
          </Link>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function IconChatList() {
  return (
    <span className="grid h-4 w-4 place-items-center text-current" aria-hidden="true">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6h16M4 12h16M4 18h10" />
      </svg>
    </span>
  );
}
