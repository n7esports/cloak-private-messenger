"use client";

// React #185 hotfix: no router/searchParams sync in this component.
import { useState } from "react";
import { MessagesView } from "../../components/MessagesView";
import { ChatView } from "../../components/ChatView";
import { useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";

type MobileView = "list" | "chat";

export default function ChatsPage() {
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const [mobileView, setMobileView] = useState<MobileView>("list");

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
