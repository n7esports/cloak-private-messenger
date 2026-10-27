"use client";

import { useState } from "react";
import { useChatStore } from "../store/useChatStore";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { VaultModal } from "../../components/modals/VaultModal";
import { SecurityModal } from "../../components/modals/SecurityModal";
import { CallModal } from "../../components/modals/CallModal";

export default function ChatsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-obsidian">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-72 transform border-r border-zinc-800/60 bg-zinc-950/40 backdrop-blur-xl transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onNavigate={() => setSidebarOpen(false)} />
      </aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col min-w-0">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>

      {/* Global modals */}
      <VaultModal />
      <SecurityModal />
      <CallModal />
    </div>
  );
}
