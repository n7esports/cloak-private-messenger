"use client";

import { useState } from "react";
import IconChat from "../icons/IconChat";
import IconPhone from "../icons/IconPhone";
import IconStar from "../icons/IconStar";
import IconTrash2 from "../icons/IconTrash2";
import IconSettings from "../icons/IconSettings";

type RailTab = "chats" | "calls" | "starred" | "archived" | "settings";

const ITEMS: { id: RailTab; icon: typeof IconChat }[] = [
  { id: "chats", icon: IconChat },
  { id: "calls", icon: IconPhone },
  { id: "starred", icon: IconStar },
  { id: "archived", icon: IconTrash2 },
  { id: "settings", icon: IconSettings },
];

export default function IconRail({ active, onSelect }: { active: RailTab; onSelect: (tab: RailTab) => void }) {
  return (
    <aside className="flex h-screen w-14 flex-col items-center border-r border-hairline bg-surface-container py-3 gap-1">
      {ITEMS.map(({ id, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onSelect(id)}
          className={`flex h-10 w-10 items-center justify-center rounded-xl transition ${
            active === id ? "bg-primary text-on-primary" : "text-on-surface-variant hover:bg-surface-high hover:text-on-surface"
          }`}
          title={id}
        >
          <Icon size={18} />
        </button>
      ))}
    </aside>
  );
}
