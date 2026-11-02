"use client";

import { useState } from "react";
import IconChat from "../icons/IconChat";
import IconPhone from "../icons/IconPhone";
import IconSettings from "../icons/IconSettings";

type BottomTab = "chats" | "calls" | "settings";

export default function BottomNav({ active, onSelect }: { active: BottomTab; onSelect: (tab: BottomTab) => void }) {
  const items: { id: BottomTab; label: string; icon: typeof IconChat }[] = [
    { id: "chats", label: "Chats", icon: IconChat },
    { id: "calls", label: "Calls", icon: IconPhone },
    { id: "settings", label: "Settings", icon: IconSettings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-hairline bg-surface-container pb-safe pt-1 md:hidden">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`flex flex-1 flex-col items-center gap-0.5 py-2 ${
            active === id ? "text-primary" : "text-on-surface-variant"
          }`}
        >
          <Icon size={22} />
          <span className="text-[10px] font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}
