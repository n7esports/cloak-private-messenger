"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconBlock,
  IconBroadcast,
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDownload,
  IconFlag,
  IconInfo,
  IconList,
  IconPaint,
  IconSearch,
  IconStar,
  IconStarFilled,
  IconTimer,
  IconTrash,
  IconUsers,
} from "../icons/UiIcons";
import type { ChatSummary } from "../../store/useChatStore";

export type ChatActionId =
  | "contact-info"
  | "search"
  | "select-messages"
  | "mute"
  | "disappearing"
  | "theme"
  | "favorite"
  | "add-to-list"
  | "export"
  | "close"
  | "send-call-link"
  | "new-group-call"
  | "report"
  | "block"
  | "clear"
  | "delete";

export interface ChatOptionsMenuProps {
  chat: ChatSummary;
  open: boolean;
  onClose: () => void;
  onAction: (action: ChatActionId, value?: string | number) => void;
}

const MUTE_OPTIONS = [
  { label: "For 1 hour", ms: 3_600_000 },
  { label: "For 8 hours", ms: 28_800_000 },
  { label: "For 1 week", ms: 604_800_000 },
  { label: "Always", ms: Number.POSITIVE_INFINITY },
];

const DISAPPEARING_OPTIONS = [
  { label: "Off", ms: undefined as number | undefined },
  { label: "24 hours", ms: 86_400_000 },
  { label: "7 days", ms: 604_800_000 },
  { label: "90 days", ms: 7_776_000_000 },
];

const THEME_OPTIONS = [
  { id: "default", label: "Cloak Green", className: "bg-emerald-500" },
  { id: "ocean", label: "Ocean", className: "bg-sky-500" },
  { id: "violet", label: "Violet", className: "bg-violet-500" },
  { id: "amber", label: "Amber", className: "bg-amber-500" },
  { id: "rose", label: "Rose", className: "bg-rose-500" },
];

const LIST_OPTIONS = [
  { id: "family", label: "Family" },
  { id: "work", label: "Work" },
  { id: "friends", label: "Friends" },
  { id: "none", label: "No list" },
];

type Submenu = "mute" | "disappearing" | "theme" | "list" | null;

interface ItemDef {
  id: ChatActionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  submenu?: Exclude<Submenu, null>;
  confirm?: string;
}

export function ChatOptionsMenu({
  chat,
  open,
  onClose,
  onAction,
}: ChatOptionsMenuProps) {
  const [submenu, setSubmenu] = useState<Submenu>(null);
  const [confirming, setConfirming] = useState<ItemDef | null>(null);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isMuted = chat.mutedUntil !== undefined && chat.mutedUntil > Date.now();

  useEffect(() => {
    if (!open) {
      setSubmenu(null);
      setConfirming(null);
      return undefined;
    }
    firstFocusRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (confirming) setConfirming(null);
        else if (submenu) setSubmenu(null);
        else onClose();
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open, confirming, submenu, onClose]);

  const items: ItemDef[] = [
    { id: "contact-info", label: "Contact info", icon: IconInfo },
    { id: "search", label: "Search", icon: IconSearch },
    { id: "select-messages", label: "Select messages", icon: IconList },
    {
      id: "mute",
      label: isMuted ? "Unmute notifications" : "Mute notifications",
      icon: IconTimer,
      submenu: isMuted ? undefined : "mute",
    },
    {
      id: "disappearing",
      label: "Disappearing messages",
      icon: IconTimer,
      submenu: "disappearing",
    },
    { id: "theme", label: "Chat theme", icon: IconPaint, submenu: "theme" },
    {
      id: "favorite",
      label: chat.favorite ? "Remove from favourites" : "Add to favourites",
      icon: chat.favorite ? IconStarFilled : IconStar,
    },
    { id: "add-to-list", label: "Add to list", icon: IconList, submenu: "list" },
    { id: "export", label: "Export chat", icon: IconDownload },
    { id: "close", label: "Close chat", icon: IconClose },
    { id: "send-call-link", label: "Send call link", icon: IconBroadcast },
    { id: "new-group-call", label: "New group call", icon: IconUsers },
    { id: "report", label: "Report", icon: IconFlag, confirm: "Report this contact?" },
    {
      id: "block",
      label: chat.blocked ? "Unblock contact" : "Block contact",
      icon: IconBlock,
      danger: !chat.blocked,
      confirm: chat.blocked ? undefined : "Block this contact?",
    },
    { id: "clear", label: "Clear chat", icon: IconTrash, confirm: "Clear all messages in this chat?" },
    {
      id: "delete",
      label: "Delete chat",
      icon: IconTrash,
      danger: true,
      confirm: "Delete this chat permanently?",
    },
  ];

  function run(item: ItemDef) {
    if (item.submenu) {
      setSubmenu(item.submenu);
      return;
    }
    if (item.confirm) {
      setConfirming(item);
      return;
    }
    onAction(item.id);
    onClose();
  }

  const rowClass =
    "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cloak-accent";

  function renderRow(item: ItemDef, isFirst = false) {
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        ref={isFirst ? firstFocusRef : undefined}
        type="button"
        onClick={() => run(item)}
        className={`${rowClass} ${
          item.danger ? "text-cloak-danger" : "text-cloak-text"
        }`}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.submenu && <IconChevronRight className="h-4 w-4 shrink-0 opacity-60" />}
      </button>
    );
  }

  const title =
    submenu === "mute"
      ? "Mute notifications"
      : submenu === "disappearing"
        ? "Disappearing messages"
        : submenu === "theme"
          ? "Chat theme"
          : submenu === "list"
            ? "Add to list"
            : null;

  if (!open || !mounted) return null;

  // Portal to <body>: the header that hosts this trigger has a backdrop-filter,
  // which creates a containing block that would otherwise clip the fixed menu.
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center pt-[env(safe-area-inset-top)] md:items-start md:justify-end md:p-4"
      role="presentation"
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 md:hidden"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="menu"
        aria-label="Chat options"
        className="cloak-glass-strong relative flex max-h-full min-h-0 w-full flex-col overflow-hidden rounded-t-3xl pb-[max(env(safe-area-inset-bottom),0.5rem)] shadow-2xl md:mt-16 md:w-72 md:rounded-2xl md:pb-2"
      >
        <div className="mx-auto mb-2 mt-2 h-1 w-10 shrink-0 rounded-full bg-white/20 md:hidden" />
        <div className="cloak-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain p-2">
        {title && (
          <div className="mb-1 flex items-center gap-2 px-2 py-1">
            <button
              type="button"
              onClick={() => setSubmenu(null)}
              className="grid h-11 w-11 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              aria-label="Back"
            >
              <IconChevronLeft className="h-5 w-5" />
            </button>
            <p className="truncate text-sm font-semibold">{title}</p>
          </div>
        )}

        {submenu === "mute" &&
          MUTE_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                onAction("mute", option.ms);
                onClose();
              }}
              className={rowClass}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
            </button>
          ))}

        {submenu === "disappearing" &&
          DISAPPEARING_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                onAction("disappearing", option.ms ?? 0);
                onClose();
              }}
              className={rowClass}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {chat.disappearingMs === option.ms && (
                <span className="text-cloak-accent">✓</span>
              )}
            </button>
          ))}

        {submenu === "theme" &&
          THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onAction("theme", option.id);
                onClose();
              }}
              className={rowClass}
            >
              <span className={`h-5 w-5 shrink-0 rounded-full ${option.className}`} />
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {chat.theme === option.id && (
                <span className="text-cloak-accent">✓</span>
              )}
            </button>
          ))}

        {submenu === "list" &&
          LIST_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onAction("add-to-list", option.id);
                onClose();
              }}
              className={rowClass}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {chat.listId === option.id && (
                <span className="text-cloak-accent">✓</span>
              )}
            </button>
          ))}

        {!submenu &&
          items.map((item, index) => renderRow(item, index === 0))}
        </div>

        {confirming && (
          <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 px-5">
            <section
              role="alertdialog"
              aria-modal="true"
              aria-label={confirming.confirm}
              className="cloak-glass-strong w-full max-w-sm rounded-2xl p-5"
            >
              <h2 className="text-sm font-semibold">{confirming.label}</h2>
              <p className="mt-2 text-sm leading-6 text-cloak-muted">
                {confirming.confirm}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(null)}
                  className="min-h-11 rounded-xl border border-white/10 px-4 text-sm transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const item = confirming;
                    setConfirming(null);
                    onAction(item.id);
                    onClose();
                  }}
                  className="min-h-11 rounded-xl bg-cloak-danger px-4 text-sm font-semibold text-white transition hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-cloak-danger"
                >
                  Confirm
                </button>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export { THEME_OPTIONS };
