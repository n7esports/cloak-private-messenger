"use client";

import { useEffect, useRef, useState } from "react";
import AppShell, { type RailTab } from "../../components/shell/AppShell";
import IconRail from "../../components/shell/IconRail";
import BottomNav from "../../components/shell/BottomNav";
import { ChatView } from "../../components/ChatView";
import { MyIdentityModal } from "../../components/modals/MyIdentityModal";
import { useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import { startChatServices } from "../../store/useChatStore";
import IconPlus from "../../components/icons/IconPlus";
import CallsPage from "../calls/page";

type MobileView = "list" | "chat";
type BottomTab = "chats" | "calls" | "settings";

/** Map the mobile bottom-nav tab onto the left icon rail so both stay in sync. */
const MOBILE_TO_RAIL: Record<BottomTab, RailTab> = {
  chats: "chats",
  calls: "calls",
  settings: "settings",
};

export default function ChatsPage() {
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const [identityOpen, setIdentityOpen] = useState(false);
  const [railTab, setRailTab] = useState<RailTab>("chats");
  const [mobileTab, setMobileTab] = useState<BottomTab>("chats");
  const startedRef = useRef(false);

  useEffect(() => {
    if (isUnlocked && !startedRef.current) {
      startedRef.current = true;
      startChatServices();
    }
  }, [isUnlocked]);

  // Keep the icon rail in sync with the mobile bottom nav (and vice versa).
  const handleMobileTab = (tab: BottomTab) => {
    setMobileTab(tab);
    setRailTab(MOBILE_TO_RAIL[tab]);
    setMobileView("list");
  };

  const handleRailTab = (tab: RailTab) => {
    setRailTab(tab);
    if (tab === "chats" || tab === "calls" || tab === "settings") {
      setMobileTab(tab as BottomTab);
    }
  };

  if (!isUnlocked) return null;

  const handleChatSelect = (chatId: string) => {
    setActiveChat(chatId);
    setMobileView("chat");
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Desktop 3-column layout */}
      <div className="hidden md:flex w-full h-full relative">
        <IconRail active={railTab} onSelect={handleRailTab} />
        <div className="w-[350px] h-full relative">
          <AppShell
            railTab={railTab}
            onOpenIdentity={() => setIdentityOpen(true)}
            onSelectChat={handleChatSelect}
          />
          {/* Desktop FAB (new chat) — only meaningful on the chats tab */}
          {(railTab === "chats" || railTab === "starred" || railTab === "archived") && (
            <button
              onClick={() => alert("Open Contact Picker")}
              className="absolute bottom-4 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg hover:bg-primary/90"
              title="New chat"
            >
              <IconPlus size={22} />
            </button>
          )}
        </div>
        <main className="flex-1 w-full h-full">
          {railTab === "calls" ? (
            <div className="text-sm text-on-surface-variant p-6">
              Select a conversation to see it here. Use the Calls tab in the left column to browse call history.
            </div>
          ) : railTab === "settings" ? (
            <div className="text-sm text-on-surface-variant p-6">
              Settings are shown in the middle column. Pick a section to edit it.
            </div>
          ) : railTab === "starred" || railTab === "archived" ? (
            <div className="text-sm text-on-surface-variant p-6">
              Select a conversation from the {railTab === "starred" ? "starred" : "archived"} list to open it here.
            </div>
          ) : activeChatId ? (
            <ChatView chatId={activeChatId} />
          ) : (
            <WelcomePanel />
          )}
        </main>
      </div>

      {/* Mobile single-screen layout — mobileTab now fully switches screens */}
      <div className="flex w-full flex-col md:hidden pb-14">
        {mobileTab === "calls" ? (
          <div className="flex-1">
            <CallsPage />
          </div>
        ) : mobileTab === "settings" ? (
          <div className="flex-1">
            <AppShell railTab="settings" onSelectChat={handleChatSelect} />
          </div>
        ) : mobileView === "list" ? (
          <div className="flex-1 relative">
            <AppShell railTab={railTab === "chats" ? "chats" : railTab} onOpenIdentity={() => setIdentityOpen(true)} onSelectChat={handleChatSelect} />
            {/* Mobile FAB */}
            <button
              onClick={() => alert("Open Contact Picker")}
              className="absolute bottom-16 right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg hover:bg-primary/90"
              title="New chat"
            >
              <IconPlus size={22} />
            </button>
          </div>
        ) : (
          <div className="flex-1">
            <ChatView chatId={activeChatId} onBack={() => setMobileView("list")} />
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <BottomNav active={mobileTab} onSelect={handleMobileTab} />

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
          strokeWidth={1.5}
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
