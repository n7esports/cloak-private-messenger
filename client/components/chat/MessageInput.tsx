"use client";

import { useRef, type FormEvent } from "react";
import { AttachmentChip } from "../AttachmentView";
import {
  IconFlame,
  IconMic,
  IconPaperclip,
  IconSend,
  IconSmile,
  IconTimer,
} from "../icons/UiIcons";
import { EPHEMERAL_TIMERS, formatFileSize, MAX_ATTACHMENT_BYTES } from "../../lib/protocol";
import type { MessageAttachment } from "../../lib/protocol";

const TIMER_LABELS = new Map<number, string>([
  [5_000, "5s"],
  [60_000, "1m"],
  [3_600_000, "1h"],
  [86_400_000, "1d"],
  [604_800_000, "7d"],
]);

export interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onAttach: () => void;
  isSending: boolean;
  isPreparingAttachment: boolean;
  attachment: MessageAttachment | null;
  onRemoveAttachment: () => void;
  ephemeralTimer?: number;
  onEphemeralTimerChange: (timer: number | undefined) => void;
  isTimerMenuOpen: boolean;
  onToggleTimerMenu: () => void;
  onOpenEmoji: () => void;
  onStartRecording: () => void;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Auto-expanding composer. Enter sends, Shift+Enter adds a newline. The right
 * button swaps between a microphone (empty input) and a send arrow (typed or
 * attachment pending). Every icon lives in a fixed 44x44 hit-box.
 */
export function MessageInput({
  value,
  onChange,
  onSubmit,
  onAttach,
  isSending,
  isPreparingAttachment,
  attachment,
  onRemoveAttachment,
  ephemeralTimer,
  onEphemeralTimerChange,
  isTimerMenuOpen,
  onToggleTimerMenu,
  onOpenEmoji,
  onStartRecording,
  disabled = false,
  placeholder = "Write an encrypted message…",
}: MessageInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const shiftHeldRef = useRef(false);
  const canSend = Boolean(value.trim() || attachment);

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Shift") {
      shiftHeldRef.current = true;
      return;
    }
    const native = event.nativeEvent;
    const isEnter = event.key === "Enter" || native.keyCode === 13;
    if (!isEnter || native.isComposing || native.keyCode === 229) return;
    if (event.shiftKey) return;
    event.preventDefault();
    if (canSend && !isSending && !disabled) onSubmit();
  }

  function handleBeforeInput(event: FormEvent<HTMLTextAreaElement>) {
    const inputType = (event.nativeEvent as InputEvent).inputType;
    if (inputType !== "insertLineBreak" || shiftHeldRef.current) return;
    event.preventDefault();
    if (canSend && !isSending && !disabled) onSubmit();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canSend && !isSending && !disabled) onSubmit();
      }}
      className="cloak-glass overflow-hidden rounded-2xl p-2"
    >
      {attachment && (
        <div className="px-1 pt-1">
          <AttachmentChip attachment={attachment} onRemove={onRemoveAttachment} />
        </div>
      )}

      <label htmlFor="chat-message" className="sr-only">
        Message
      </label>
      <textarea
        id="chat-message"
        rows={1}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onKeyUp={(event) => {
          if (event.key === "Shift") shiftHeldRef.current = false;
        }}
        onBeforeInput={handleBeforeInput}
        placeholder={placeholder}
        className="cloak-scroll max-h-40 min-h-11 w-full resize-none bg-transparent px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-cloak-dim disabled:opacity-60"
      />

      <div className="flex items-center gap-1 px-1 pt-1">
        <div className="relative">
          <button
            type="button"
            onClick={onToggleTimerMenu}
            className={`grid h-11 w-11 place-items-center rounded-xl transition ${
              ephemeralTimer !== undefined
                ? "bg-cloak-accent/15 text-cloak-accent"
                : "text-cloak-muted hover:bg-white/5 hover:text-cloak-text"
            }`}
            aria-label="Disappearing messages"
            title="Disappearing messages"
          >
            <IconTimer className="h-5 w-5" />
          </button>
          {isTimerMenuOpen && (
            <div className="cloak-glass-strong absolute bottom-12 left-0 z-20 w-44 rounded-xl p-1.5 shadow-2xl">
              <button
                type="button"
                onClick={() => onEphemeralTimerChange(undefined)}
                className={`flex min-h-11 w-full items-center rounded-lg px-3 text-left text-xs transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cloak-accent ${
                  ephemeralTimer === undefined ? "text-cloak-accent" : ""
                }`}
              >
                Off
              </button>
              {EPHEMERAL_TIMERS.map((timer) => (
                <button
                  key={timer}
                  type="button"
                  onClick={() => onEphemeralTimerChange(timer)}
                  className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-xs transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cloak-accent ${
                    ephemeralTimer === timer ? "text-cloak-accent" : ""
                  }`}
                >
                  <IconFlame className="h-3.5 w-3.5" />
                  {TIMER_LABELS.get(timer)}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenEmoji}
          className="grid h-11 w-11 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          aria-label="Emoji and stickers"
          title="Emoji and stickers"
        >
          <IconSmile className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onAttach}
          disabled={isPreparingAttachment}
          className={`grid h-11 w-11 place-items-center rounded-xl transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:opacity-50 ${
            attachment ? "text-cloak-accent" : "text-cloak-muted hover:text-cloak-text"
          }`}
          aria-label="Attach a file"
          title={`Attach a file (max ${formatFileSize(MAX_ATTACHMENT_BYTES)})`}
        >
          <IconPaperclip className="h-5 w-5" />
        </button>

        {canSend ? (
          <button
            type="submit"
            disabled={isSending || disabled}
            className="ml-auto grid h-11 w-11 place-items-center rounded-xl bg-cloak-accent text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send message"
            title="Send message"
          >
            <IconSend className="h-5 w-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartRecording}
            className="ml-auto grid h-11 w-11 place-items-center rounded-xl bg-cloak-accent/15 text-cloak-accent transition hover:bg-cloak-accent/25 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            aria-label="Record a voice message"
            title="Record a voice message"
          >
            <IconMic className="h-5 w-5" />
          </button>
        )}
      </div>
    </form>
  );
}
