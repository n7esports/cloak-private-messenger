"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessagesView } from "../../components/MessagesView";
import { ChatView } from "../../components/ChatView";
import { ChannelsView } from "../../components/ChannelsView";
import { SettingsView } from "../../components/SettingsView";
import { useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import { startChatServices } from "../../store/useChatStore";

type View = "chats" | "channels" | "settings";

export default function ChatsPage() {
  const router = useRouter();
  const { isUnlocked } = useVaultStore();
  const { activeChatId, setActiveChat } = useChatStore();
  const [view, setView] = useState<View>("chats");
  const [mobileView, setMobileView] = useState<"list" | "chat">("list");

  useEffect(() => {
    if (!isUnlocked) {
      router.replace("/lock");
    } else {
      startChatServices();
    }
  }, [isUnlocked, router]);

  if (!isUnlocked) return null;

  if (view === "channels") {
    return <ChannelsView />;
  }
  if (view === "settings") {
    return <SettingsView />;
  }

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="hidden md:flex md:w-80 lg:w-96 flex-col">
        <MessagesView
          activeChatId={activeChatId}
          onSelectChat={(id) => setActiveChat(id)}
          onNavigateToChannels={() => setView("channels")}
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
              onNavigateToChannels={() => setView("channels")}
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
