"use client";

import { useRef } from "react";
import { AttachmentView } from "../AttachmentView";
import { MessageStatusTicks } from "../MessageStatusTicks";
import { IconChevronDown, IconFlame, IconPin, IconStarFilled } from "../icons/UiIcons";
import type { ChatMessage } from "../../store/useChatStore";

export interface MessageBubbleProps {
  message: ChatMessage;
  selected: boolean;
  selectionMode: boolean;
  timerLabel?: string;
  onToggleSelect: (messageId: string) => void;
  onOpenMenu: (message: ChatMessage, anchor: HTMLElement) => void;
  onLongPressStart: (message: ChatMessage, anchor: HTMLElement) => void;
  onLongPressCancel: () => void;
}

/**
 * A single message bubble. Desktop reveals the actions chevron on hover at the
 * top-right corner of the box; touch devices keep it visible and also open the
 * action menu on long-press.
 */
export function MessageBubble({
  message,
  selected,
  selectionMode,
  timerLabel,
  onToggleSelect,
  onOpenMenu,
  onLongPressStart,
  onLongPressCancel,
}: MessageBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  return (
    <article
      className={`group flex items-end gap-2 ${
        message.outgoing ? "justify-end" : "justify-start"
      }`}
    >
      {selectionMode && (
        <button
          type="button"
          onClick={() => onToggleSelect(message.id)}
          aria-label={selected ? "Deselect message" : "Select message"}
          aria-pressed={selected}
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-md border transition ${
            selected
              ? "border-cloak-accent bg-cloak-accent text-cloak-base"
              : "border-white/20 text-transparent hover:border-cloak-accent"
          } ${message.outgoing ? "order-first" : "order-last"}`}
        >
          ✓
        </button>
      )}
      <div className="group/bubble relative flex min-w-0 max-w-[78%] items-start gap-1">
        <div
          ref={bubbleRef}
          data-message-id={message.id}
          onClick={() => {
            if (selectionMode) onToggleSelect(message.id);
          }}
          onContextMenu={(event) => {
            event.preventDefault();
            if (!selectionMode) onOpenMenu(message, event.currentTarget);
          }}
          onPointerDown={(event) => {
            if (event.pointerType === "touch" && !selectionMode) {
              onLongPressStart(message, event.currentTarget);
            }
          }}
          onPointerUp={onLongPressCancel}
          onPointerLeave={onLongPressCancel}
          onPointerMove={onLongPressCancel}
          onPointerCancel={onLongPressCancel}
          className={`cloak-bubble min-w-[4.5rem] flex-1 select-none rounded-2xl px-4 py-2.5 ${
            message.outgoing
              ? "rounded-br-md bg-cloak-accent/20"
              : "cloak-glass-soft rounded-bl-md"
          } ${selected ? "ring-2 ring-cloak-accent" : ""}`}
        >
          {message.replyTo && (
            <div className="mb-1.5 rounded-lg border-l-2 border-cloak-accent/60 bg-black/20 px-2.5 py-1.5">
              <p className="truncate text-[11px] font-semibold text-cloak-accent">
                {message.replyTo.alias}
              </p>
              <p className="truncate text-[11px] text-cloak-muted">
                {message.replyTo.excerpt}
              </p>
            </div>
          )}
          {message.attachment && (
            <div className={message.content ? "mb-2" : ""}>
              <AttachmentView attachment={message.attachment} />
            </div>
          )}
          <p className="whitespace-pre-wrap break-words text-sm leading-6">
            {message.content}
          </p>
          {message.reactions && message.reactions.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {message.reactions.map((reaction) => (
                <span
                  key={reaction}
                  className="rounded-full border border-white/10 bg-black/25 px-1.5 py-0.5 text-xs"
                >
                  {reaction}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1.5 flex items-center justify-end gap-2 text-[11px] text-cloak-muted">
            {message.pinned && <IconPin className="h-3 w-3 text-cloak-accent" />}
            {message.starred && (
              <IconStarFilled className="h-3 w-3 text-cloak-accent" />
            )}
            {message.ephemeralTimer !== undefined && (
              <span className="inline-flex items-center gap-1 text-cloak-accent">
                <IconFlame className="h-3 w-3" />
                {timerLabel}
              </span>
            )}
            <time>{new Date(message.timestamp).toLocaleTimeString()}</time>
            {message.outgoing && <MessageStatusTicks status={message.status} />}
          </div>
        </div>
        {!selectionMode && (
          <button
            type="button"
            onClick={() =>
              onOpenMenu(message, bubbleRef.current ?? document.body)
            }
            aria-label="Message actions"
            title="Message actions"
            className={`grid h-7 w-7 shrink-0 place-items-center self-start rounded-full text-cloak-muted opacity-0 transition hover:text-cloak-text focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-cloak-accent group-hover/bubble:opacity-100 max-md:opacity-100 ${
              message.outgoing ? "order-first" : "order-last"
            }`}
          >
            <IconChevronDown className="h-4 w-4" />
          </button>
        )}
      </div>
    </article>
  );
}
