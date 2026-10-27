"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";

export function ChatView({
  chatId,
  onBack,
}: {
  chatId: string | null;
  onBack?: () => void;
}) {
  const messages = useChatStore((s) =>
    chatId ? s.messagesMap[chatId] ?? [] : [],
  );
  const chats = useChatStore((s) => s.chats);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const showToast = useChatStore((s) => s.showToast);
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const chat = chatId ? chats.find((c) => c.id === chatId) ?? null : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!chatId || !chat) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-obsidian">
        <div className="glass-panel px-8 py-6 text-center">
          <h2 className="font-serif text-xl font-semibold text-zinc-100">
            Cloak
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Select a conversation to start messaging.
          </p>
        </div>
      </div>
    );
  }

  const handleSend = async () => {
    const text = content.trim();
    if (!text) return;
    setContent("");
    await sendMessage(text);
  };

  return (
    <div className="flex h-full w-full flex-col bg-obsidian">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-zinc-800/60 bg-zinc-950/40 px-4 py-3 backdrop-blur-xl">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-300"
          >
            Back
          </button>
        )}
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-crimson to-violet shadow-glow-sm">
          <span className="text-sm font-bold text-white">
            {chat.alias.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-zinc-100 truncate">
            {chat.alias}
          </h3>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500">
            {chat.recipientPubKey ? "E2EE active" : "Local notes"}
          </p>
        </div>
        <button
          onClick={() =>
            showToast({
              id: crypto.randomUUID(),
              message: "Safety numbers verified",
              type: "success",
            })
          }
          className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
        >
          Verify
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-zinc-500">
            No messages yet. Say hello.
          </p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((msg) => {
            const isMe = msg.senderPubKey === "me" || msg.outgoing;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    isMe
                      ? "bg-red-500/20 text-red-200 border border-red-500/30"
                      : "bg-zinc-800/70 text-zinc-200 border border-zinc-700/50"
                  }`}
                >
                  {!isMe && (
                    <p className="mb-1 text-[10px] font-medium uppercase tracking-widest text-zinc-400">
                      {msg.senderPubKey.slice(0, 16)}...
                    </p>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    {msg.attachment && (
                      <span className="text-[10px] text-zinc-400">
                        📎 {msg.attachment.name}
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {isMe && (
                      <span className="text-[10px] text-zinc-400">
                        {msg.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800/60 bg-zinc-950/40 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          <button
            onClick={() =>
              showToast({
                id: crypto.randomUUID(),
                message: "Attachment picker not wired",
                type: "info",
              })
            }
            className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-xs text-zinc-400 transition hover:text-zinc-200"
          >
            📎
          </button>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Message..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-crimson/60"
          />
          <button
            onClick={handleSend}
            disabled={!content.trim()}
            className="rounded-lg bg-crimson px-4 py-2 text-xs font-medium text-white transition hover:bg-crimson/90 disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
