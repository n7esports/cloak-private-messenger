"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useChatStore, type ChatMessage } from "../store/useChatStore";
import {
  IconCheck,
  IconCheckDouble,
  IconChevronLeft,
  IconClose,
  IconCopy,
  IconDownload,
  IconFile,
  IconForward,
  IconImage,
  IconLock,
  IconMic,
  IconMore,
  IconPaperclip,
  IconPhone,
  IconReply,
  IconSend,
  IconShield,
  IconSmile,
  IconTimer,
  IconTrash,
  IconVideo,
} from "./icons/UiIcons";

const EMOJI_LIST = [
  "\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F525}", "\u{26A1}", "\u{1F510}",
  "\u{1F6E1}\u{FE0F}", "\u{2728}", "\u{1F389}", "\u{1F602}", "\u{1F62E}",
  "\u{1F622}", "\u{1F680}", "\u{1F3AF}", "\u{1F440}", "\u{1F916}", "\u{1F4E1}",
  "\u{1F4A1}", "\u{1F511}", "\u{1F4BB}", "\u{2615}", "\u{1F64C}", "\u{1F91D}",
  "\u{1F576}\u{FE0F}", "\u{1F310}", "\u{2705}", "\u{23F3}", "\u{1F4E6}",
  "\u{1F50D}", "\u{1F4AC}", "\u{1F512}", "\u{1FA84}", "\u{1F4A5}",
];

const AVATAR_TINTS = [
  "from-emerald-500/30 to-emerald-500/5 text-emerald-200",
  "from-sky-500/30 to-sky-500/5 text-sky-200",
  "from-violet-500/30 to-violet-500/5 text-violet-200",
  "from-amber-500/30 to-amber-500/5 text-amber-200",
  "from-rose-500/30 to-rose-500/5 text-rose-200",
];

function avatarTint(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

function initials(alias: string): string {
  const trimmed = alias.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatView() {
  const activeChatId = useChatStore((s) => s.activeChatId);
  const chats = useChatStore((s) => s.chats);
  const messagesMap = useChatStore((s) => s.messagesMap);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const showToast = useChatStore((s) => s.showToast);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const deleteMessages = useChatStore((s) => s.deleteMessages);

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [timerPopoverOpen, setTimerPopoverOpen] = useState(false);
  const [attachPopoverOpen, setAttachPopoverOpen] = useState(false);
  const [emojiPopoverOpen, setEmojiPopoverOpen] = useState(false);
  const [contextMenuMsgId, setContextMenuMsgId] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [activeReactions, setActiveReactions] = useState<{ [msgId: string]: string[] }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const activeChat = chats.find((c) => c.id === activeChatId);
  const messages = useMemo(
    () => (activeChatId ? (messagesMap[activeChatId] ?? []) : []),
    [activeChatId, messagesMap],
  );

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isTyping]);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setTimerPopoverOpen(false);
      setAttachPopoverOpen(false);
      setEmojiPopoverOpen(false);
      setContextMenuMsgId(null);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    try {
      await sendMessage(trimmed);
      setInputText("");
      setTimerPopoverOpen(false);
      setAttachPopoverOpen(false);
      setEmojiPopoverOpen(false);
    } catch (err) {
      showToast({
        id: crypto.randomUUID(),
        message: err instanceof Error ? err.message : "Failed to send message",
        type: "warning",
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void handleSend();
    }
  };

  const addReaction = (msgId: string, emoji: string) => {
    setActiveReactions((prev) => {
      const current = prev[msgId] || [];
      const next = current.includes(emoji)
        ? current.filter((e) => e !== emoji)
        : [...current, emoji];
      return { ...prev, [msgId]: next };
    });
    void updateMessage(msgId, {
      reactions: activeReactions[msgId]?.includes(emoji)
        ? (activeReactions[msgId] ?? []).filter((e) => e !== emoji)
        : [...(activeReactions[msgId] ?? []), emoji],
    });
  };

  const handleContextMenuAction = (action: "reply" | "copy" | "forward" | "delete") => {
    const msg = messages.find((m: ChatMessage) => m.id === contextMenuMsgId);
    if (action === "copy" && msg) {
      navigator.clipboard?.writeText(msg.content);
      showToast({ id: crypto.randomUUID(), message: "Message copied to clipboard" });
    } else if (action === "reply" && msg) {
      setInputText(`Replying to "${msg.content.slice(0, 30)}...": `);
      inputRef.current?.focus();
    } else if (action === "forward") {
      showToast({
        id: crypto.randomUUID(),
        message: "Select relay recipient to forward cryptographic packet",
      });
    } else if (action === "delete" && msg) {
      void deleteMessages([msg.id]);
      showToast({
        id: crypto.randomUUID(),
        message: "Message scrubbed from volatile local RAM & remote relay nodes",
      });
    }
    setContextMenuMsgId(null);
  };

  if (!activeChat) {
    return (
      <div className="cloak-ambient cloak-app-screen flex flex-col items-center justify-center font-sans text-cloak-text">
        <div className="cloak-glass max-w-md rounded-2xl p-8 text-center">
          <IconShield className="mx-auto mb-5 h-16 w-16 text-cloak-accent" />
          <h2 className="text-xl font-semibold">Select a conversation</h2>
          <p className="mt-3 text-sm leading-6 text-cloak-muted">
            Choose a conversation from the list to start messaging.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-[calc(100dvh-4rem)] relative">
      {/* Background illumination */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        <div className="absolute -top-24 right-1/4 w-96 h-96 rounded-full bg-cloak-accent/10 blur-[100px]" />
        <div className="absolute bottom-10 left-10 w-72 h-72 rounded-full bg-cloak-accent/5 blur-[80px]" />
      </div>

      {/* Chat Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 lg:px-space-lg py-2.5 bg-cloak-surface-0/85 backdrop-blur-2xl border-b border-cloak-border shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => {
              setActiveChat(null);
              if (window.location.pathname.startsWith("/chats/chat/")) {
                window.location.href = "/chats";
              }
            }}
            className="p-1.5 rounded-xl text-cloak-muted hover:text-cloak-text hover:bg-cloak-surface-1 transition-colors cursor-pointer"
            title="Back to conversation list"
          >
            <IconChevronLeft className="text-[20px]" />
          </button>

          <div
            className="relative flex-shrink-0 cursor-pointer"
            onClick={() =>
              showToast({
                id: crypto.randomUUID(),
                message: "Key verification opened",
              })
            }
          >
            <div
              className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarTint(
                activeChat.id,
              )} flex items-center justify-center font-bold shadow-md`}
            >
              {initials(activeChat.alias)}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-cloak-accent ring-2 ring-cloak-surface shadow-[0_0_8px_#10b981]" />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs flex-wrap">
              <span className="font-headline-sm text-headline-sm text-cloak-text font-semibold tracking-tight truncate">
                {activeChat.alias}
              </span>
              <IconShield className="text-cloak-accent text-[18px]" />
              <span className="px-2 py-0.5 rounded-full bg-cloak-accent/20 text-cloak-accent font-label-code-sm text-label-code-sm font-semibold tracking-wider">
                FP: 4B89...99A2
              </span>
            </div>
            <div className="flex items-center gap-2 text-cloak-muted">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cloak-accent opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cloak-accent" />
              </span>
              <span className="font-body-sm text-body-sm text-cloak-muted truncate">
                Online • Verified Session • Signal Protocol v4 (Ratchet #142)
              </span>
            </div>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1 sm:gap-space-xs flex-shrink-0">
          <button
            onClick={() =>
              showToast({
                id: crypto.randomUUID(),
                message: "Encrypted video call initiated",
              })
            }
            className="flex items-center gap-1.5 px-space-sm py-2 rounded-xl text-cloak-muted hover:text-cloak-accent hover:bg-cloak-surface-2 transition-all cursor-pointer"
            title="Encrypted Video Call"
          >
            <IconVideo className="text-[20px]" />
            <span className="font-body-sm text-body-sm hidden md:inline">Video</span>
          </button>

          <button
            onClick={() =>
              showToast({
                id: crypto.randomUUID(),
                message: "Encrypted audio call initiated",
              })
            }
            className="flex items-center gap-1.5 px-space-sm py-2 rounded-xl text-cloak-muted hover:text-cloak-accent hover:bg-cloak-surface-2 transition-all cursor-pointer"
            title="Encrypted Audio Call"
          >
            <IconPhone className="text-[20px]" />
            <span className="font-body-sm text-body-sm hidden md:inline">Audio</span>
          </button>

          <button
            onClick={() =>
              showToast({
                id: crypto.randomUUID(),
                message: "Key Details & Safety Numbers",
              })
            }
            className="p-2 rounded-xl text-cloak-muted hover:text-cloak-accent hover:bg-cloak-surface-2 transition-all cursor-pointer"
            title="Key Details & Safety Numbers"
          >
            <IconLock className="text-[20px]" />
          </button>

          <button
            onClick={() =>
              showToast({
                id: crypto.randomUUID(),
                message: "Session State: Pairwise Ratchet #142 Active (Kyber-1024 hybrid)",
              })
            }
            className="p-2 rounded-xl text-cloak-muted hover:text-cloak-text hover:bg-cloak-surface-2 transition-all cursor-pointer"
            title="More Options"
          >
            <IconMore className="text-[20px]" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-4 md:px-space-lg py-space-md space-y-4 scroll-smooth">
        {/* Encrypted Session Banner */}
        <div className="flex flex-col items-center justify-center my-space-md">
          <div className="flex items-center gap-space-xs px-4 py-2 rounded-full bg-cloak-surface-1/70 shadow-sm border border-cloak-border">
            <IconLock className="text-cloak-accent text-[16px]" />
            <span className="font-label-code-sm text-label-code-sm text-cloak-muted">
              Messages to this chat are end-to-end encrypted
            </span>
          </div>
        </div>

        {/* Date Pill */}
        <div className="flex justify-center my-2">
          <span className="px-3 py-1 rounded-full bg-cloak-surface-0/80 text-cloak-muted font-label-code-sm text-label-code-sm shadow-sm backdrop-blur-md border border-cloak-border/30">
            Today
          </span>
        </div>

        {/* Message Thread List */}
        {messages.map((msg: ChatMessage) => {
          const isMe = msg.outgoing;
          const combinedReactions = [
            ...(msg.reactions || []),
            ...(activeReactions[msg.id] || []),
          ];

          return (
            <div
              key={msg.id}
              className={`group relative flex flex-col ${
                isMe ? "items-end max-w-xl ml-auto" : "items-start max-w-xl"
              }`}
            >
              <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
                {!isMe && (
                  <div
                    className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarTint(
                      activeChat.id,
                    )} flex items-center justify-center text-xs font-bold mb-1 ring-1 ring-cloak-border flex-shrink-0`}
                  >
                    {initials(activeChat.alias)}
                  </div>
                )}

                <div
                  className={`relative p-space-md rounded-2xl backdrop-blur-md shadow-sm transition-shadow ${
                    isMe
                      ? "bg-cloak-accent/10 bg-cloak-surface-0/90 rounded-br-sm text-cloak-text border border-cloak-accent/20"
                      : "bg-cloak-surface-0/80 rounded-bl-sm text-cloak-text border border-cloak-border"
                  }`}
                >
                  <p className="font-body-md text-body-md leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>

                  {/* Attachment card if present */}
                  {msg.attachment && (
                    <div className="mt-2 p-3 rounded-xl bg-cloak-surface-0/80 flex items-center gap-3 border border-cloak-border">
                      <IconFile className="text-cloak-accent text-[28px]" />
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-cloak-text">
                          {msg.attachment.name}
                        </span>
                        <span className="font-label-code-sm text-label-code-sm text-cloak-muted font-mono">
                          {msg.attachment.size} bytes
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          showToast({
                            id: crypto.randomUUID(),
                            message: `Decrypted & verified attachment: ${msg.attachment?.name}`,
                          })
                        }
                        className="ml-auto p-2 rounded-lg bg-cloak-surface-1 hover:bg-cloak-surface-2 text-cloak-accent transition-colors cursor-pointer"
                        title="Download Encrypted Dump"
                      >
                        <IconDownload className="text-[18px]" />
                      </button>
                    </div>
                  )}

                  {/* Timestamp & status icon */}
                  <div
                    className={`flex items-center justify-end gap-1.5 mt-1 font-label-code-sm text-label-code-sm ${
                      isMe ? "text-cloak-accent" : "text-cloak-muted"
                    }`}
                  >
                    <span className="text-cloak-muted">{formatTime(msg.timestamp)}</span>
                    {isMe &&
                      (msg.status === "read" ? (
                        <IconCheckDouble className="text-[15px] text-cloak-accent" />
                      ) : (
                        <IconCheck className="text-[15px] text-cloak-accent" />
                      ))}
                  </div>
                </div>
              </div>

              {/* Hover Quick Reaction & Context Button Bar */}
              <div
                className={`hidden group-hover:flex items-center gap-1 absolute -top-4 ${
                  isMe ? "right-2" : "left-9"
                } bg-cloak-surface-2/95 backdrop-blur-md px-2 py-1 rounded-full shadow-lg z-20 border border-cloak-border/30`}
              >
                {["\u{1F44D}", "\u{2764}\u{FE0F}", "\u{1F525}", "\u{26A1}"].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => addReaction(msg.id, emoji)}
                    className="hover:scale-125 transition-transform text-sm cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
                <span className="w-[1px] h-3 bg-cloak-border mx-1" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const rect = e.currentTarget.getBoundingClientRect();
                    setContextMenuPos({ x: rect.left, y: rect.bottom + 4 });
                    setContextMenuMsgId(msg.id);
                  }}
                  className="text-cloak-muted hover:text-cloak-text cursor-pointer"
                  title="Message options"
                >
                  <IconMore className="text-[16px]" />
                </button>
              </div>

              {/* Reaction Badges */}
              {combinedReactions.length > 0 && (
                <div
                  className={`flex gap-1 mt-1 ${
                    isMe ? "mr-2 justify-end" : "ml-9 justify-start"
                  }`}
                >
                  {combinedReactions.map((emoji, i) => (
                    <button
                      key={i}
                      onClick={() => addReaction(msg.id, emoji)}
                      className="px-2 py-0.5 rounded-full bg-cloak-surface-1 text-cloak-text font-label-code-sm text-label-code-sm flex items-center gap-1 hover:bg-cloak-surface-2 transition-colors cursor-pointer border border-cloak-border/50"
                    >
                      <span>{emoji}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Live typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2 max-w-xs transition-opacity duration-300">
            <div
              className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarTint(
                activeChat.id,
              )} flex items-center justify-center text-xs font-bold mb-1 ring-1 ring-cloak-border`}
            >
              {initials(activeChat.alias)}
            </div>
            <div className="bg-cloak-surface-0/80 backdrop-blur-md px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5 shadow-sm border border-cloak-border">
              <span className="w-2 h-2 rounded-full bg-cloak-accent animate-bounce [animation-delay:-0.3s]" />
              <span className="w-2 h-2 rounded-full bg-cloak-accent animate-bounce [animation-delay:-0.15s]" />
              <span className="w-2 h-2 rounded-full bg-cloak-accent animate-bounce" />
              <span className="font-label-code-sm text-label-code-sm text-cloak-muted ml-2 font-mono">
                {activeChat.alias} is typing...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Composer Section */}
      <div className="relative px-4 lg:px-space-lg pb-space-md pt-space-xs bg-cloak-bg/90 backdrop-blur-2xl border-t border-cloak-border/30 safe-area-footer" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 12px)" }}>
        <div className="relative w-full max-w-4xl mx-auto">
          {/* Disappearing Timer Selector Popup */}
          {timerPopoverOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-16 left-0 z-40 p-space-sm bg-cloak-surface-2/95 backdrop-blur-xl rounded-2xl shadow-xl flex flex-col gap-1 w-48 border border-cloak-border/40 animate-in fade-in zoom-in-95"
            >
              <span className="font-label-code-sm text-label-code-sm text-cloak-muted px-2 py-1 font-mono uppercase">
                Disappearing Timer
              </span>
              {(["Off", "1h", "24h", "7d"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTimerPopoverOpen(false);
                    showToast({
                      id: crypto.randomUUID(),
                      message: `Disappearing messages set to: ${t}`,
                    });
                  }}
                  className="flex items-center justify-between px-3 py-1.5 rounded-xl text-cloak-text font-body-sm text-body-sm transition-colors cursor-pointer hover:bg-cloak-surface-1"
                >
                  <span>
                    {t === "Off"
                      ? "Off"
                      : t === "1h"
                        ? "1 Hour"
                        : t === "24h"
                          ? "24 Hours"
                          : "7 Days"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Attachment Menu Popover */}
          {attachPopoverOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-16 left-12 sm:left-24 z-40 p-space-xs bg-cloak-surface-2/95 backdrop-blur-xl rounded-2xl shadow-xl flex flex-col gap-1 w-52 border border-cloak-border/40 animate-in fade-in zoom-in-95"
            >
              {[
                { icon: IconImage, label: "Encrypted Photo", msg: "Encrypted photo packet generated" },
                { icon: IconFile, label: "Zero-Knowledge File", msg: "Zero-knowledge file payload attached" },
                { icon: IconLock, label: "Secure Camera", msg: "Hardware camera secure sandbox opened" },
              ].map(({ icon: Icon, label, msg }) => (
                <button
                  key={label}
                  onClick={() => {
                    setAttachPopoverOpen(false);
                    showToast({ id: crypto.randomUUID(), message: msg });
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-cloak-surface-1 text-cloak-text font-body-sm text-body-sm transition-colors cursor-pointer"
                >
                  <Icon className="text-cloak-accent text-[20px]" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Emoji Picker Popover */}
          {emojiPopoverOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-16 right-2 sm:right-16 z-40 p-3 bg-cloak-surface-2/95 backdrop-blur-xl rounded-2xl shadow-2xl w-[calc(100vw-1rem)] max-w-72 border border-cloak-border/40 animate-in fade-in zoom-in-95"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-cloak-border/40">
                <span className="font-label-code-sm text-label-code-sm text-cloak-muted uppercase tracking-wider font-mono">
                  Reaction & Emoji
                </span>
                <span className="font-label-code-sm text-label-code-sm text-cloak-accent font-mono">
                  Fast Insert
                </span>
              </div>
              <div className="grid grid-cols-8 gap-1.5 text-lg max-h-44 overflow-y-auto pr-1">
                {EMOJI_LIST.map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText((prev) => prev + emoji);
                      inputRef.current?.focus();
                    }}
                    className="p-1 hover:bg-cloak-surface-1 rounded transition-transform hover:scale-125 flex items-center justify-center cursor-pointer"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Floating Bar */}
          <div className="flex items-center gap-space-xs bg-cloak-surface-0/95 p-2 rounded-2xl shadow-xl backdrop-blur-xl border border-cloak-border/50">
            {/* Disappearing Timer Pill Trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTimerPopoverOpen(!timerPopoverOpen);
                setAttachPopoverOpen(false);
                setEmojiPopoverOpen(false);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cloak-surface-1 hover:bg-cloak-surface-2 text-cloak-muted hover:text-cloak-accent transition-all cursor-pointer"
              title="Disappearing messages timer"
            >
              <IconTimer className="text-[18px] text-cloak-accent" />
              <span className="font-label-code-sm text-label-code-sm font-semibold font-mono">
                24h
              </span>
            </button>

            {/* Attachment Trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAttachPopoverOpen(!attachPopoverOpen);
                setTimerPopoverOpen(false);
                setEmojiPopoverOpen(false);
              }}
              className="p-2 rounded-xl text-cloak-muted hover:text-cloak-text hover:bg-cloak-surface-1 transition-all cursor-pointer"
              title="Encrypted attachment"
            >
              <IconPaperclip className="text-[20px]" />
            </button>

            {/* Composer Input Field */}
            <div className="relative flex-1 flex items-center">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-cloak-surface-0/70 text-cloak-text placeholder:text-cloak-dim/50 font-body-md text-body-md px-4 py-2.5 rounded-xl outline-none focus:ring-1 focus:ring-cloak-accent/40 transition-all border border-transparent focus:border-cloak-accent/20 resize-none min-h-[40px] max-h-[120px]"
                placeholder="Type an end-to-end encrypted message..."
                rows={1}
              />
            </div>

            {/* Emoji Picker Trigger */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEmojiPopoverOpen(!emojiPopoverOpen);
                setTimerPopoverOpen(false);
                setAttachPopoverOpen(false);
              }}
              className="p-2 rounded-xl text-cloak-muted hover:text-cloak-accent hover:bg-cloak-surface-1 transition-all cursor-pointer"
              title="Insert emoji"
            >
              <IconSmile className="text-[20px]" />
            </button>

            {/* Push-to-Talk / Mic Trigger */}
            <button
              onClick={() =>
                showToast({
                  id: crypto.randomUUID(),
                  message: "Encrypted voice packet captured: 42s audio encoded via Opus KEM",
                })
              }
              className="p-2 rounded-xl text-cloak-muted hover:text-cloak-accent hover:bg-cloak-surface-1 transition-all cursor-pointer"
              title="Hold for Encrypted Voice Memo"
            >
              <IconMic className="text-[20px]" />
            </button>

            {/* Send Button */}
            <button
              onClick={() => void handleSend()}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-cloak-accent text-cloak-base shadow-[0_0_16px_rgba(78,222,163,0.35)] hover:bg-cloak-accent-hover transition-all active:scale-95 cursor-pointer flex-shrink-0"
              title="Send Encrypted Message"
            >
              <IconSend className="text-[20px]" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Context Menu */}
      {contextMenuMsgId && contextMenuPos && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            top: Math.min(contextMenuPos.y, window.innerHeight - 220),
            left: Math.min(contextMenuPos.x, window.innerWidth - 180),
          }}
          className="fixed z-50 p-1.5 bg-cloak-surface-2/95 backdrop-blur-xl rounded-xl shadow-2xl border border-cloak-border/40 flex flex-col gap-0.5 w-36 animate-in fade-in zoom-in-95"
        >
          {[
            { action: "reply" as const, icon: IconReply, label: "Reply", color: "text-cloak-accent" },
            { action: "copy" as const, icon: IconCopy, label: "Copy", color: "text-cloak-accent" },
            { action: "forward" as const, icon: IconForward, label: "Forward", color: "text-cloak-muted" },
            { action: "delete" as const, icon: IconTrash, label: "Delete", color: "text-red-400" },
          ].map(({ action, icon: Icon, label, color }) => (
            <button
              key={action}
              onClick={() => handleContextMenuAction(action)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cloak-surface-1 text-cloak-text font-body-sm text-body-sm transition-colors cursor-pointer`}
            >
              <Icon className={`text-[16px] ${color}`} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
