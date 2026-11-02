"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "../../components/shell/AppShell";
import IconRail from "../../components/shell/IconRail";
import { ChatView } from "../../components/ChatView";
import { MyIdentityModal } from "../../components/modals/MyIdentityModal";
import { useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import { startChatServices } from "../../store/useChatStore";

type MobileView = "list" | "chat";
type RailTab = "chats" | "calls" | "starred" | "archived" | "settings";

export default function ChatsPage() {
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [identityOpen, setIdentityOpen] = useState(false);
  const [railTab, setRailTab] = useState<RailTab>("chats");
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
      {/* Desktop 3-column layout */}
      <div className="hidden md:flex w-full h-full">
        <IconRail active={railTab} onSelect={setRailTab} />
        <div className="w-[350px] h-full">
          <AppShell onOpenIdentity={() => setIdentityOpen(true)} />
        </div>
        <main className="flex-1 w-full h-full">
          {activeChatId ? (
            <ChatView chatId={activeChatId} />
          ) : (
            <WelcomePanel />
          )}
        </main>
      </div>

      {/* Mobile single-screen layout */}
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

      <MyIdentityModal open={identityOpen} onClose={() => setIdentityOpen(false)} />
    </div>
  );
}

function WelcomePanel() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width={64}
          height={64}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <p className="text-sm font-medium text-text-primary">Welcome to UQZERA</p>
        <p className="text-xs text-text-secondary">Select a thread to establish an E2EE channel.</p>
      </div>
    </div>
  );
}
