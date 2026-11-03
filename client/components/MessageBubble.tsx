"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useChatStore, type ChatMessage } from "../store/useChatStore";
import IconReply from "./icons/IconReply";
import IconCopy from "./icons/IconCopy";
import IconForward from "./icons/IconForward";
import IconPin from "./icons/IconPin";
import IconStar from "./icons/IconStar";
import IconInfo from "./icons/IconInfo";
import IconTrash from "./icons/IconTrash";
import IconX from "./icons/IconX";
import IconCheck from "./icons/IconCheck";
import IconCheckDouble from "./icons/IconCheckDouble";
import IconFile from "./icons/IconFile";
import IconDownload from "./icons/IconDownload";

interface MessageBubbleProps {
  message: ChatMessage;
  isMe: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export default function MessageBubble({ message, isMe }: MessageBubbleProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showMedia, setShowMedia] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const openMenu = () => setShowMenu(true);
  const closeMenu = () => setShowMenu(false);

  useEffect(() => {
    if (!showMenu) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest("[data-menu]") && menuRef.current && !menuRef.current.contains(target)) {
        setShowMenu(false);
        setShowReactions(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [showMenu]);

  const alignment = isMe ? "justify-end" : "justify-start";
  const bubbleMargin = isMe ? "ml-auto" : "mr-auto";
  const bubbleBg = isMe ? "bg-primary/20 text-on-surface" : "bg-surface-container";

  const canEdit =
    isMe &&
    message.type === "text" &&
    Date.now() - message.timestamp < 15 * 60 * 1000;

  const startReply = () => {
    useChatStore.getState().setReplyTo({
      id: message.id,
      alias: message.senderPubKey.slice(0, 8),
      excerpt: message.content.slice(0, 100),
    });
    setShowMenu(false);
  };

  const startEdit = () => {
    useChatStore.getState().setEditingMessageId(message.id);
    useChatStore.getState().setReplyTo(null);
    setShowMenu(false);
  };

  const addReaction = (emoji: string) => {
    const current = useChatStore.getState();
    const msg = current.messagesMap[message.chatId]?.find((m) => m.id === message.id);
    if (!msg) return;
    const reactions = [...(msg.reactions ?? [])];
    const idx = reactions.indexOf(emoji);
    if (idx >= 0) {
      reactions.splice(idx, 1);
    } else {
      reactions.push(emoji);
    }
    current.updateMessage(message.id, { reactions });
    setShowReactions(false);
    setShowMenu(false);
  };

  const copyText = async () => {
    await navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  const reactionCounts = new Map<string, number>();
  for (const r of message.reactions ?? []) {
    reactionCounts.set(r, (reactionCounts.get(r) || 0) + 1);
  }

  return (
    <div
      className={`relative flex ${alignment} gap-2`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault();
        openMenu();
      }}
      onTouchStart={() => {
        longPressTimer.current = setTimeout(() => {
          openMenu();
        }, 500);
      }}
      onTouchMove={() => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }}
      onTouchEnd={() => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
      }}
    >
      <motion.div
        ref={menuRef}
        data-menu
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
        {/* Hover menu button */}
        <div className={`absolute -top-2 right-2 transition-opacity ${hovered ? "opacity-100" : "opacity-0"}`}>
          <button
            onClick={openMenu}
            className="rounded-full bg-surface border border-hairline p-1 hover:bg-surface-high"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

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
            <span className="text-[10px] text-text-secondary">{(message.attachment.size / 1024).toFixed(0)} KB</span>
            <button className="rounded border border-border-default px-2 py-0.5 text-[10px] text-text-primary transition hover:bg-surface-high">
              Decrypt
            </button>
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
          {message.edited && <span className="ml-1 text-[10px] text-text-secondary">(edited)</span>}
        </p>

        {/* Reactions */}
        {reactionCounts.size > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {Array.from(reactionCounts.entries()).map(([emoji, count]) => (
              <span
                key={emoji}
                className="rounded-full border border-hairline bg-surface px-1.5 py-0.5 text-[10px] text-text-secondary"
              >
                {emoji} {count}
              </span>
            ))}
          </div>
        )}

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

        {/* Context menu */}
        {showMenu && !showReactions && (
          <div className="absolute top-full mt-1 w-44 rounded-lg border border-hairline bg-surface-container shadow-panel z-50">
            <button onClick={startReply} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconReply size={14} /> Reply
            </button>
            <button onClick={copyText} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconCopy size={14} /> Copy
            </button>
            <button onClick={() => { console.log("Forward message"); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconForward size={14} /> Forward
            </button>
            <button onClick={() => { console.log("Pin message"); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconPin size={14} /> Pin
            </button>
            <button onClick={() => { console.log("Star message"); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconStar size={14} /> Star
            </button>
            <button onClick={() => { console.log("Message info"); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-primary hover:bg-surface-high">
              <IconInfo size={14} /> Message Info
            </button>
            <button onClick={() => { console.log("Delete message"); setShowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-surface-high">
              <IconTrash size={14} /> Delete
            </button>
          </div>
        )}

        {showReactions && (
          <div className="absolute top-full mt-1 w-40 rounded-lg border border-hairline bg-surface-container shadow-panel z-50">
            <div className="flex justify-around px-2 py-2">
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => addReaction(emoji)}
                  className="rounded p-1 text-sm hover:bg-surface-high"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

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
