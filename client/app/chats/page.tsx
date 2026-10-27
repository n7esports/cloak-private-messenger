"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    if (!isUnlocked) {
      router.replace("/lock");
    } else {
      startChatServices();
    }
  }, [isUnlocked, router]);

  useEffect(() => {
    const chatParam = searchParams.get("chat");
    if (chatParam && chatParam !== activeChatId) {
      setActiveChat(chatParam);
    }
  }, [searchParams, activeChatId, setActiveChat]);

  useEffect(() => {
    const chatParam = searchParams.get("chat");
    if (chatParam !== activeChatId) {
      const params = new URLSearchParams(searchParams.toString());
      if (activeChatId) {
        params.set("chat", activeChatId);
      } else {
        params.delete("chat");
      }
      router.replace(`/chats?${params.toString()}`, { scroll: false });
    }
  }, [activeChatId, router, searchParams]);

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
