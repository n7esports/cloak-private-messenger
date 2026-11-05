"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useChatStore, type ChatMessage } from "../store/useChatStore";
import IconDownload from "./icons/IconDownload";
import IconFile from "./icons/IconFile";
import IconX from "./icons/IconX";
import IconCheck from "./icons/IconCheck";
import IconCheckDouble from "./icons/IconCheckDouble";

interface MessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function MessageBubble({ message, isMe }: MessageBubbleProps) {
  const [showMedia, setShowMedia] = useState(false);

  const alignment = isMe ? "justify-end" : "justify-start";
  const bubbleMargin = isMe ? "ml-auto" : "mr-auto";
  const bubbleBg = isMe ? "bg-primary/20 text-on-surface" : "bg-surface-container";

  return (
    <div className={`relative flex ${alignment} gap-2`}>
      <motion.div
        className={`max-w-[75%] rounded-xl px-4 py-2 ${bubbleMargin} ${bubbleBg}`}
        drag={isMe ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={(_, info) => {
          if (isMe && info.offset.x < -50) {
            useChatStore.getState().setReplyTo({
              id: message.id,
              alias: message.senderPubKey.slice(0, 8),
              excerpt: message.content,
            });
          }
        }}
      >
        {/* Reply preview */}
        {message.replyTo && (
          <div className="mb-2 rounded-lg border border-hairline bg-surface/60 px-3 py-2">
            <p className="text-[10px] font-medium text-text-primary">{message.replyTo.alias}</p>
            <p className="text-xs text-text-secondary line-clamp-1">{message.replyTo.excerpt}</p>
          </div>
        )}

        {/* Attachment */}
        {message.attachment && !message.attachment.mime?.startsWith("image/") && (
          <div className="mb-2 flex items-center gap-2 rounded-lg border border-border-default bg-surface/60 px-3 py-2">
            <IconFile size={18} />
            <span className="flex-1 truncate text-xs text-text-primary">{message.attachment.name}</span>
            <span className="text-[10px] text-text-secondary">{formatBytes(message.attachment.size)}</span>
          </div>
        )}

        {message.attachment?.mime?.startsWith("image/") && message.attachment.data && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.attachment.data}
            alt={message.attachment.name}
            className="mb-2 max-h-48 rounded-lg cursor-pointer"
            onClick={() => setShowMedia(true)}
          />
        )}

        {/* Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-text-primary">
          {message.content}
        </p>

        {/* Time */}
        <div className="mt-1 flex items-center justify-end gap-2">
          {isMe && (
            <span>
              {message.status === "read" && <IconCheckDouble size={14} className="text-primary" />}
              {message.status === "delivered" && <IconCheckDouble size={14} className="text-text-secondary" />}
              {message.status === "sent" && <IconCheck size={14} className="text-text-secondary" />}
            </span>
          )}
          <span className="text-[10px] text-text-secondary">
            {isMe ? "You" : message.senderPubKey.slice(0, 8)}
          </span>
          <span className="text-[10px] text-text-secondary">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })}
          </span>
        </div>

        {/* Media viewer */}
        {showMedia && message.attachment?.data && (
          <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
            <div className="flex items-center justify-between p-4">
              <button onClick={() => setShowMedia(false)} className="p-2 rounded-md hover:bg-white/10">
                <IconX size={24} className="text-white" />
              </button>
              <a
                href={message.attachment.data}
                download={message.attachment.name}
                className="p-2 rounded-md hover:bg-white/10"
              >
                <IconDownload size={24} className="text-white" />
              </a>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {message.attachment.mime?.startsWith("video/") ? (
                <video src={message.attachment.data} controls className="max-h-[80vh] max-w-[90vw]" />
              ) : (
                <img src={message.attachment.data} alt={message.attachment.name} className="max-h-[80vh] max-w-[90vw] object-contain" />
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
