"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MessagesView } from "../../components/MessagesView";
import { ChatView } from "../../components/ChatView";
import { useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import { startChatServices } from "../../store/useChatStore";

type MobileView = "list" | "chat";

export default function ChatsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isUnlocked } = useVaultStore();
  const { activeChatId, setActiveChat } = useChatStore();
  const [mobileView, setMobileView] = useState<MobileView>("list");

  const currentChatParam = searchParams.get("chat");

  useEffect(() => {
    if (!isUnlocked) {
      router.replace("/lock");
    } else {
      startChatServices();
    }
  }, [isUnlocked, router]);

  useEffect(() => {
    if (activeChatId && currentChatParam !== activeChatId) {
      router.replace(`/chats?chat=${activeChatId}`, { scroll: false });
    }
  }, [activeChatId, currentChatParam, router]);

  if (!isUnlocked) return null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="hidden md:flex md:w-80 lg:w-96 flex-col">
        <MessagesView
          activeChatId={activeChatId}
          onSelectChat={(id) => {
            setActiveChat(id);
          }}
        />
      </div>

      <div className="flex w-full flex-col md:hidden">
        {mobileView === "list" ? (
          <div className="flex-1">
            <MessagesView
              activeChatId={activeChatId}
              onSelectChat={(id) => {
                setActiveChat(id);
                setMobileView("chat");
              }}
            />
          </div>
        ) : (
          <div className="flex-1">
            <ChatView chatId={activeChatId} onBack={() => setMobileView("list")} />
          </div>
        )}
      </div>

      <main className="hidden flex-1 md:block">
        <ChatView chatId={activeChatId} />
      </main>
    </div>
  );
}
