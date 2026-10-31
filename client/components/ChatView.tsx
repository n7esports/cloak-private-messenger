"use client";

import { useEffect, useRef, useState } from "react";
import { useChatStore, type ChatMessage } from "../store/useChatStore";
import { useVaultStore } from "../store/useVaultStore";
import MessageBubble from "./MessageBubble";
import IconAttach from "./icons/IconAttach";
import IconClock from "./icons/IconClock";
import IconForward from "./icons/IconForward";
import IconLock from "./icons/IconLock";
import IconMoreVertical from "./icons/IconMoreVertical";
import IconPhone from "./icons/IconPhone";
import IconPin from "./icons/IconPin";
import IconReply from "./icons/IconReply";
import IconSearch from "./icons/IconSearch";
import IconStar from "./icons/IconStar";
import IconTrash from "./icons/IconTrash";
import IconVideo from "./icons/IconVideo";
import IconX from "./icons/IconX";
import IconSend from "./icons/IconSend";

const EMPTY_MESSAGES: ChatMessage[] = [];

export function ChatView({
  chatId,
  onBack,
}: {
  chatId: string | null;
  onBack?: () => void;
}) {
  const messages = useChatStore((s) => (chatId ? s.messagesMap[chatId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES));
  const chats = useChatStore((s) => s.chats);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const showToast = useChatStore((s) => s.showToast);
  const setActiveChat = useChatStore((s) => s.setActiveChat);
  const clearChatMessages = useChatStore((s) => s.clearChatMessages);
  const ephemeralTtl = useChatStore((s) => s.ephemeralTtl);
  const setEphemeralTtl = useChatStore((s) => s.setEphemeralTtl);
  const isPeerTyping = useChatStore((s) => (chatId ? !!s.peerTypingByChat[chatId] : false));
  const lockVault = useVaultStore((s) => s.lockVault);

  const [content, setContent] = useState("");
  const [pendingAttachment, setPendingAttachment] = useState<{ name: string; mime: string; size: number; dataUrl: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const chat = chatId ? chats.find((c) => c.id === chatId) ?? null : null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error || "Upload failed");
      }
      const data = await res.json();
      setPendingAttachment({ name: data.name, mime: data.mime, size: data.size, dataUrl: data.signedUrl });
    } catch (err) {
      showToast({ id: crypto.randomUUID(), message: `Upload failed: ${err}`, type: "warning" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async () => {
    const text = content.trim();
    if (!text && !pendingAttachment) return;
    setContent("");
    try {
      await sendMessage(
        text,
        "text",
        ephemeralTtl ?? undefined,
        pendingAttachment
          ? { name: pendingAttachment.name, mime: pendingAttachment.mime, size: pendingAttachment.size, data: pendingAttachment.dataUrl }
          : undefined
      );
      setPendingAttachment(null);
    } catch (err) {
      showToast({ id: crypto.randomUUID(), message: `Send failed: ${err}`, type: "warning" });
    }
  };

  const handleClearChat = async () => {
    if (!chatId || !chat) return;
    await clearChatMessages(chatId);
  };

  const cycleEphemeralTtl = () => {
    const presets = [0, 60, 300, 900, 3600];
    const idx = presets.indexOf(ephemeralTtl ?? 0);
    const next = presets[(idx + 1) % presets.length];
    setEphemeralTtl(next || null);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isPeerTyping]);

  if (!chatId || !chat) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-2">
          <IconLock size={48} className="text-primary" />
          <p className="text-sm font-medium text-text-primary">No active session</p>
          <p className="text-xs text-text-secondary">Select a thread to establish an E2EE channel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border-default bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button onClick={onBack} className="md:hidden rounded-lg border border-border-default px-2 py-1 text-xs text-text-secondary">
              Back
            </button>
          )}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-on-surface truncate">{chat.alias}</h3>
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" title="Online" />
          </div>
          <span className="text-xs text-on-surface-variant">E2EE Direct</span>
          <span className="text-[10px] text-on-surface-variant">Last seen {new Date(chat.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-surface-high rounded-md" title="Video call">
            <IconVideo size={18} />
          </button>
          <button className="p-2 hover:bg-surface-high rounded-md" title="Voice call">
            <IconPhone size={18} />
          </button>
          <button className="p-2 hover:bg-surface-high rounded-md" title="Search messages">
            <IconSearch size={18} />
          </button>
          <button className="p-2 hover:bg-surface-high rounded-md" title="More options">
            <IconMoreVertical size={18} />
          </button>
        </div>
      </header>

      {/* Ephemeral banner */}
      <div className="flex justify-center px-4 pt-3">
        <button
          onClick={cycleEphemeralTtl}
          title="Click to change TTL"
          className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-container px-3 py-1 text-xs text-text-secondary transition hover:bg-surface-high"
        >
          <IconClock size={12} />
          Messages auto-shred after {ephemeralTtl ? `${ephemeralTtl / 60 > 0 ? ephemeralTtl / 60 + " min" : ephemeralTtl + "s"}` : "off"}
        </button>
      </div>

      {/* Session established line */}
      <div className="flex justify-center px-4 pt-1 pb-2">
        <p className="text-[10px] font-mono uppercase tracking-wider text-text-secondary">
          Session established · X25519 + AES-256-GCM
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 pb-24">
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-outline">No messages yet. Say hello.</p>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((msg) => {
            const isMe = msg.senderPubKey === "me" || msg.outgoing;
            return (
              <div key={msg.id} className={`group flex ${isMe ? "justify-end" : "justify-start"}`}>
                <MessageBubble message={msg} isMe={isMe} />
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Typing indicator */}
      {isPeerTyping && (
        <div className="px-4 pb-1 text-[10px] text-text-secondary">Peer is typing…</div>
      )}

      {/* Composer */}
      <div className="flex-shrink-0 border-t border-border-default bg-surface">
        {/* Attachment preview */}
        {pendingAttachment && (
          <div className="flex items-center gap-2 border-b border-border-default bg-surface/40 px-4 py-2">
            <IconAttach size={14} />
            <span className="flex-1 truncate text-xs text-text-secondary">{pendingAttachment.name}</span>
            <span className="text-[10px] text-text-secondary">{(pendingAttachment.size / 1024).toFixed(0)} KB</span>
            <button onClick={() => setPendingAttachment(null)} className="rounded p-1 hover:bg-surface-high">
              <IconX size={14} />
            </button>
          </div>
        )}
        <div className="p-4">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,application/pdf,text/plain"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Attach file"
              className="rounded-lg border border-border-default bg-surface-container p-2 text-xs text-text-secondary transition hover:text-text-primary disabled:opacity-50"
            >
              <IconAttach size={16} />
            </button>
            <button
              onClick={cycleEphemeralTtl}
              title="Ephemeral TTL"
              className="rounded-lg border border-border-default bg-surface-container p-2 text-xs text-text-secondary transition hover:text-text-primary"
            >
              <IconClock size={16} />
            </button>
            <button
              title="Voice message"
              className="rounded-lg border border-border-default bg-surface-container p-2 text-xs text-text-secondary transition hover:text-text-primary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write encrypted message..."
              rows={1}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="flex-1 resize-none rounded-xl border border-border-default bg-surface-container px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary outline-none focus:border-primary"
            />
            <button
              onClick={handleSend}
              disabled={!content.trim() && !pendingAttachment}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-on-primary transition hover:bg-primary/90 disabled:opacity-40"
            >
              <span className="flex items-center gap-1.5">
                <IconSend size={16} />
                Encrypt & Send
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
