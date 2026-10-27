"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversationList } from "../../components/ConversationList";
import { ChatWindow } from "../../components/ChatWindow";
import { useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import { startChatServices } from "../../store/useChatStore";

export default function ChatsPage() {
  const router = useRouter();
  const { isUnlocked } = useVaultStore();
  const { activeChatId, setActiveChat } = useChatStore();
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  useEffect(() => {
    if (!isUnlocked) {
      router.replace("/lock");
    } else {
      startChatServices();
    }
  }, [isUnlocked, router]);

  if (!isUnlocked) return null;

  const chat = activeChatId
    ? useChatStore.getState().chats.find((c) => c.id === activeChatId) ?? null
    : null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="hidden md:flex md:w-80 lg:w-96 flex-col border-r border-zinc-800/60 bg-zinc-950/40">
        <ConversationList
          activeChatId={activeChatId}
          onSelectChat={(id) => setActiveChat(id)}
        />
      </div>

      <div className="flex w-full flex-col md:hidden">
        {mobileView === "list" ? (
          <div className="flex-1">
            <ConversationList
              activeChatId={activeChatId}
              onSelectChat={(id) => {
                setActiveChat(id);
                setMobileView("chat");
              }}
            />
          </div>
        ) : (
          <div className="flex-1">
            <ChatWindow
              chat={chat}
              onBack={() => setMobileView("list")}
            />
          </div>
        )}
      </div>

      <main className="hidden flex-1 md:block">
        <ChatWindow chat={chat} />
      </main>
    </div>
  );
}
