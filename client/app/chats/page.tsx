"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "../../components/shell/AppShell";
import { ChatView } from "../../components/ChatView";
import { MyIdentityModal } from "../../components/modals/MyIdentityModal";
import { useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import { startChatServices } from "../../store/useChatStore";

type MobileView = "list" | "chat";

export default function ChatsPage() {
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [identityOpen, setIdentityOpen] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (isUnlocked && !startedRef.current) {
      startedRef.current = true;
      startChatServices();
    }
  }, [isUnlocked]);

  if (!isUnlocked) return null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="hidden md:flex md:w-80 lg:w-96 flex-col">
        <AppShell onOpenIdentity={() => setIdentityOpen(true)} />
      </div>

      <div className="flex w-full flex-col md:hidden">
        {mobileView === "list" ? (
          <div className="flex-1">
            <AppShell onOpenIdentity={() => setIdentityOpen(true)} />
          </div>
        ) : (
          <div className="flex-1">
            <ChatView chatId={activeChatId} onBack={() => setMobileView("list")} />
          </div>
        )}
      </div>

      <main className="hidden flex-1 md:flex">
        <ChatView chatId={activeChatId} />
      </main>

      <MyIdentityModal open={identityOpen} onClose={() => setIdentityOpen(false)} />
    </div>
  );
}
