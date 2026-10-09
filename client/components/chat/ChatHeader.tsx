"use client";

import { useEffect, useRef, useState } from "react";
import {
  IconChevronLeft,
  IconClose,
  IconKey,
  IconPhone,
  IconSearch,
  IconShield,
  IconVideo,
  IconMore,
} from "../icons/UiIcons";
import { TypingIndicator } from "../TypingIndicator";
import { ChatOptionsMenu, type ChatActionId } from "./ChatOptionsMenu";
import type { ChatSummary } from "../../store/useChatStore";

export interface ChatHeaderProps {
  chat: ChatSummary;
  typing: boolean;
  searchQuery: string;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  onSearchChange: (value: string) => void;
  onBack: () => void;
  onVideoCall: () => void;
  onAudioCall: () => void;
  onVerifyKey: () => void;
  onAction: (action: ChatActionId, value?: string | number) => void;
  isNotesChat: boolean;
}

export function ChatHeader({
  chat,
  typing,
  searchQuery,
  isSearchOpen,
  onToggleSearch,
  onSearchChange,
  onBack,
  onVideoCall,
  onAudioCall,
  onVerifyKey,
  onAction,
  isNotesChat,
}: ChatHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isSearchOpen) searchRef.current?.focus();
  }, [isSearchOpen]);

  // Desktop shortcut: Ctrl/Cmd+F opens in-chat search.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        if (!isSearchOpen) onToggleSearch();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isSearchOpen, onToggleSearch]);

  const iconButton =
    "grid h-11 w-11 shrink-0 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent";

  return (
    <header className="cloak-glass relative z-30 flex items-center gap-1 px-2 py-2 sm:gap-2 sm:px-4">
      <button
        type="button"
        onClick={onBack}
        className={`${iconButton} md:hidden`}
        aria-label="Back to conversations"
      >
        <IconChevronLeft className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        {isSearchOpen ? (
          <div className="cloak-glass-soft flex items-center gap-2 rounded-xl px-3">
            <IconSearch className="h-4 w-4 shrink-0 text-cloak-dim" />
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search in chat"
              aria-label="Search in chat"
              className="min-h-10 w-full bg-transparent text-sm outline-none placeholder:text-cloak-dim"
            />
            <button
              type="button"
              onClick={() => {
                onSearchChange("");
                onToggleSearch();
              }}
              aria-label="Close search"
              className="grid h-9 w-9 place-items-center rounded-lg text-cloak-muted transition hover:text-cloak-text"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-cloak-accent/30 bg-cloak-accent/10 text-sm font-semibold text-cloak-accent"
              aria-hidden="true"
            >
              {chat.alias.trim().slice(0, 1).toUpperCase() || "?"}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-semibold">{chat.alias}</h2>
              {typing ? (
                <TypingIndicator label="typing…" />
              ) : (
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-cloak-muted">
                  <IconShield className="h-3.5 w-3.5 shrink-0 text-cloak-accent" />
                  <span className="truncate">
                    {isNotesChat ? "Encrypted on this device" : "End-to-end encrypted"}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {!isSearchOpen && (
        <>
          {!isNotesChat && (
            <>
              <button
                type="button"
                onClick={onVideoCall}
                className={`${iconButton} hidden sm:grid`}
                aria-label="Start video call"
                title="Video call"
              >
                <IconVideo className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={onAudioCall}
                className={`${iconButton} hidden sm:grid`}
                aria-label="Start audio call"
                title="Audio call"
              >
                <IconPhone className="h-5 w-5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onToggleSearch}
            className={iconButton}
            aria-label="Search in chat"
            title="Search in chat (Ctrl+F)"
          >
            <IconSearch className="h-5 w-5" />
          </button>
          {!isNotesChat && (
            <button
              type="button"
              onClick={onVerifyKey}
              className={`${iconButton} hidden sm:grid`}
              aria-label="Verify contact key"
              title="Verify contact key"
            >
              <IconKey className="h-5 w-5" />
            </button>
          )}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className={`${iconButton} ${menuOpen ? "text-cloak-accent" : ""}`}
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            title="More options"
          >
            <IconMore className="h-5 w-5" />
          </button>
        </>
      )}

      <ChatOptionsMenu
        chat={chat}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        onAction={onAction}
      />
    </header>
  );
}
