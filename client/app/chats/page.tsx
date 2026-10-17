"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import KeyExchangeModal from "../../components/modals/KeyExchangeModal";
import NewChatModal from "../../components/modals/NewChatModal";
import { TourOverlay } from "../../components/TourOverlay";
import GuidePanel, { type GuideIntent } from "../../components/GuidePanel";
import { getTourCompletedState } from "../../lib/flags";
import { EPHEMERAL_TIMERS } from "../../lib/protocol";
import { type ChatSummary, useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import MessagesView from "../../components/MessagesView";
import ChatView from "../../components/ChatView";
import ChannelsView from "../../components/ChannelsView";
import SettingsView from "../../components/SettingsView";

export default function ChatsPage() {
  return (
    <Suspense fallback={null}>
      <ChatsPageInner />
    </Suspense>
  );
}

function ChatsPageInner() {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const searchParams = useSearchParams();
  const chats = useChatStore((state) => state.chats);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const addContact = useChatStore((state) => state.addContact);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isKeyExchangeOpen, setIsKeyExchangeOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourError, setTourError] = useState("");
  const lockVault = useVaultStore((state) => state.lockVault);
  const identity = useVaultStore((state) => state.identity);

  // Handle URL params for compose/guide
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (params.get("compose") === "1") setIsNewChatOpen(true);
    if (params.get("guide") === "1") setIsGuideOpen(true);
    const timer = Number(params.get("timer"));
    if (EPHEMERAL_TIMERS.some((supported) => supported === timer)) {
      // timer handled in ChatView
    }
    if (params.size > 0) {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams]);

  // Tour check
  useEffect(() => {
    let active = true;
    getTourCompletedState()
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

  function chooseContact(chat: ChatSummary) {
    setIsGuideOpen(false);
    setActiveChat(chat.id);
    setIsNewChatOpen(false);
    setIsKeyExchangeOpen(false);
    router.push(`/chats/chat/${chat.id}`);
  }

  function handleGuideIntent(intent: GuideIntent) {
    setIsGuideOpen(false);
    if (intent === "new-chat") {
      setIsNewChatOpen(true);
      return;
    }
    if (intent === "key-exchange") {
      setIsKeyExchangeOpen(true);
      return;
    }
    if (intent === "timer") {
      setIsNewChatOpen(true);
      return;
    }
    lockVault();
    router.replace("/lock");
  }

  // ── Route-based view rendering ───────────────────────────────────────────

  // /chats → MessagesView
  if (pathname === "/chats") {
    return (
      <div className="flex min-h-0 flex-1">
        <MessagesView />
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
        {isGuideOpen && (
          <GuidePanel
            onIntent={handleGuideIntent}
            onNavigate={(href) => {
              setIsGuideOpen(false);
              router.push(href);
            }}
          />
        )}
        {showTour && <TourOverlay onDone={() => setShowTour(false)} />}
        {tourError && (
          <p
            role="alert"
            className="cloak-glass-strong fixed bottom-4 left-4 z-50 rounded-xl px-4 py-3 text-sm text-cloak-danger"
          >
            Could not load the guide tour: {tourError}
          </p>
        )}
      </div>
    );
  }

  // /chats/chat/[id] → ChatView (activeChatId is set by the page wrapper)
  if (pathname.startsWith("/chats/chat/")) {
    const chatId = pathname.replace("/chats/chat/", "");
    // Set active chat for this route
    useEffect(() => {
      setActiveChat(chatId);
    }, [chatId]);
    return (
      <div className="flex min-h-0 flex-1">
        <ChatView />
      </div>
    );
  }

  // /chats/channels → ChannelsView
  if (pathname === "/chats/channels") {
    return (
      <div className="flex min-h-0 flex-1">
        <ChannelsView />
      </div>
    );
  }

  // /settings → SettingsView
  if (pathname === "/settings") {
    return (
      <div className="flex min-h-0 flex-1">
        <SettingsView />
      </div>
    );
  }

  // Fallback → MessagesView
  return (
    <div className="flex min-h-0 flex-1">
      <MessagesView />
    </div>
  );
}
