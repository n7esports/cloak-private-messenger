"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore } from "../store/useChatStore";

export function ChatWindow({
  chat,
  onBack,
}: {
  chat: { id: string; alias: string } | null;
  onBack?: () => void;
}) {
  const messages = useChatStore((s) =>
    chat ? s.messagesMap[chat.id] ?? [] : [],
  );
  const sendMessage = useChatStore((s) => s.sendMessage);
  const [content, setContent] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!chat) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-obsidian">
        <div className="glass-panel px-8 py-6 text-center">
          <h2 className="font-serif text-xl font-semibold text-zinc-100">Cloak</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Select a conversation to start messaging.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-obsidian">
      <header className="flex items-center gap-3 border-b border-zinc-800/60 px-4 py-3">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-300"
          >
            Back
          </button>
        )}
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{chat.alias}</h3>
          <p className="text-xs text-zinc-500">End-to-end encrypted</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`mb-3 flex ${msg.outgoing ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                msg.outgoing
                  ? "bg-crimson/20 text-zinc-100"
                  : "glass-panel text-zinc-200"
              }`}
            >
              <p>{msg.content}</p>
              <p className="mt-1 text-[10px] text-zinc-500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!content.trim()) return;
          await sendMessage(content.trim());
          setContent("");
        }}
        className="border-t border-zinc-800/60 px-4 py-3"
      >
        <div className="flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a message..."
            className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-crimson/60"
          />
          <button
            type="submit"
            className="rounded-xl bg-zinc-100 px-4 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
