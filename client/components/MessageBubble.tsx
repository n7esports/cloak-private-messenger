"use client";

import { useState } from "react";
import { useChatStore, type ChatMessage } from "../store/useChatStore";
import IconCopy from "./icons/IconCopy";
import IconFile from "./icons/IconFile";
import IconFlag from "./icons/IconFlag";
import IconForward from "./icons/IconForward";
import IconPin from "./icons/IconPin";
import IconReply from "./icons/IconReply";
import IconStar from "./icons/IconStar";
import IconTrash from "./icons/IconTrash";

interface MessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function MessageBubble({ message, isMe }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);

  const alignment = isMe ? "justify-end" : "justify-start";
  const bubbleMargin = isMe ? "ml-auto" : "mr-auto";
  const bubbleBg = isMe ? "bg-primary/20 text-on-surface" : "bg-surface-container";

  return (
    <div className={`relative flex ${alignment} gap-2`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2 ${bubbleMargin} ${bubbleBg}`}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowMenu(true);
        }}
      >
        {/* Attachment */}
        {message.attachment && !message.attachment.mime?.startsWith("image/") && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border-default bg-surface/60 px-3 py-2">
            <IconFile size={18} />
            <span className="flex-1 truncate text-xs text-text-primary">{message.attachment.name}</span>
            <span className="text-[10px] text-text-secondary">{(message.attachment.size / 1024).toFixed(0)} KB</span>
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

        {/* Time */}
        <div className="mt-1 flex items-center justify-end gap-2">
          <span className="text-[10px] text-text-secondary">
            {message.senderName}
          </span>
          <span className="text-[10px] text-text-secondary">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
          </span>
        </div>

        {/* Context menu */}
        {showMenu && (
          <div className="absolute top-full mt-1 w-40 rounded-lg border border-hairline bg-surface-container shadow-panel z-50">
            <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconReply size={14} /> Reply
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconCopy size={14} /> Copy
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconForward size={14} /> Forward
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconPin size={14} /> Pin
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconStar size={14} /> Star
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconFlag size={14} /> Report
            </button>
            <button className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-surface-high">
              <IconTrash size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
