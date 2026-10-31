"use client";

import { useChatStore, type ChatMessage } from "../store/useChatStore";
import IconFile from "./icons/IconFile";

interface MessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function MessageBubble({ message, isMe }: MessageBubbleProps) {
  const chats = useChatStore((s) => s.chats);
  const chat = chats.find((c) => c.id === message.chatId) ?? null;

  const senderName = isMe
    ? "You"
    : (message.senderPubKey.slice(0, 8) || "Unknown");

  const alignment = isMe ? "justify-end" : "justify-start";
  const bubbleBg = isMe ? "bg-primary/10" : "bg-surface-container";
  const bubbleBorder = isMe ? "border border-accent-emerald" : "border border-border-default";

  return (
    <div className={`flex ${alignment} gap-2`}>
      <div className={`relative max-w-[80%] rounded-2xl p-3 ${bubbleBg} ${bubbleBorder}`}>
        {/* Metadata above bubble */}
        <div className="mb-1 flex items-baseline gap-2 font-mono">
          <span className="text-[11px] font-medium text-text-primary">{senderName}</span>
          <span className="text-[10px] text-text-secondary">
            {new Date(message.timestamp).toISOString().slice(0, 19).replace("T", " ")} UTC
          </span>
        </div>

        {/* Attachment */}
        {message.attachment && !message.attachment.mime?.startsWith("image/") && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border-default bg-surface/60 px-3 py-2">
            <IconFile size={18} />
            <span className="flex-1 truncate text-xs text-text-primary">{message.attachment.name}</span>
            <span className="text-[10px] text-text-secondary">{formatBytes(message.attachment.size)}</span>
            <button className="rounded border border-border-default px-2 py-0.5 text-[10px] text-text-primary transition hover:bg-surface-high">
              Decrypt
            </button>
          </div>
        )}

        {message.attachment?.mime?.startsWith("image/") && message.attachment.data && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={message.attachment.data} alt={message.attachment.name} className="mb-2 max-h-48 rounded-lg" />
        )}

        {/* Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-text-primary">
          {message.content}
        </p>

        {/* Crypto metadata */}
        <div className="mt-1 flex items-center justify-end">
          <span className="font-mono text-[10px] text-text-secondary">SIG: 0x{message.id.slice(0, 16)}</span>
        </div>
      </div>
    </div>
  );
}
