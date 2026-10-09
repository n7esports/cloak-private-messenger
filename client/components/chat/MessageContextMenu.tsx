"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  IconCopy,
  IconDownload,
  IconForward,
  IconInfo,
  IconPin,
  IconReply,
  IconSmile,
  IconSpark,
  IconStar,
  IconStarFilled,
  IconTrash,
} from "../icons/UiIcons";
import {
  useContextMenuPosition,
  type AnchorRect,
} from "../../hooks/useContextMenuPosition";
import { useIsDesktop } from "../../hooks/useMediaQuery";

export type MessageActionId =
  | "info"
  | "reply"
  | "copy"
  | "react"
  | "forward"
  | "pin"
  | "ask-ai"
  | "star"
  | "delete-me"
  | "delete-everyone";

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export interface MessageContextMenuProps {
  anchor: AnchorRect;
  starred: boolean;
  pinned: boolean;
  outgoing: boolean;
  onAction: (action: MessageActionId, emoji?: string) => void;
  onClose: () => void;
}

interface ItemDef {
  id: MessageActionId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  danger?: boolean;
  divider?: boolean;
}

export function MessageContextMenu({
  anchor,
  starred,
  pinned,
  outgoing,
  onAction,
  onClose,
}: MessageContextMenuProps) {
  const isDesktop = useIsDesktop();
  const panelRef = useRef<HTMLDivElement>(null);
  const firstFocusRef = useRef<HTMLButtonElement>(null);
  const [showReactions, setShowReactions] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [size, setSize] = useState({ width: 240, height: 340 });

  const position = useContextMenuPosition(anchor, size);

  useLayoutEffect(() => {
    if (panelRef.current) {
      const rect = panelRef.current.getBoundingClientRect();
      setSize((current) =>
        current.width === rect.width && current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height },
      );
    }
  });

  useEffect(() => {
    firstFocusRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (confirmingDelete) setConfirmingDelete(false);
      else if (showReactions) setShowReactions(false);
      else onClose();
    };
    const onPointer = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [confirmingDelete, showReactions, onClose]);

  const items: ItemDef[] = [
    { id: "info", label: "Message info", icon: IconInfo },
    { id: "reply", label: "Reply", icon: IconReply },
    { id: "copy", label: "Copy", icon: IconCopy },
    { id: "react", label: "React", icon: IconSmile },
    { id: "forward", label: "Forward", icon: IconForward },
    {
      id: "pin",
      label: pinned ? "Unpin message" : "Pin message",
      icon: IconPin,
    },
    { id: "ask-ai", label: "Ask AI", icon: IconSpark },
    {
      id: "star",
      label: starred ? "Unstar" : "Star",
      icon: starred ? IconStarFilled : IconStar,
    },
    {
      id: "delete-me",
      label: "Delete",
      icon: IconTrash,
      danger: true,
      divider: true,
    },
  ];

  const rowClass =
    "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-cloak-accent";

  function run(item: ItemDef) {
    if (item.id === "delete-me") {
      setConfirmingDelete(true);
      return;
    }
    if (item.id === "react") {
      setShowReactions(true);
      return;
    }
    onAction(item.id);
  }

  const panel = (
    <div
      ref={panelRef}
      role="menu"
      aria-label="Message actions"
      className="cloak-glass-strong w-60 overflow-hidden rounded-xl p-1.5 shadow-2xl"
    >
      {showReactions ? (
        <div className="flex items-center gap-0.5 p-1">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onAction("react", emoji)}
              className="grid h-11 w-11 place-items-center rounded-lg text-xl transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
              aria-label={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onAction("react", "＋")}
            className="grid h-11 w-11 place-items-center rounded-lg text-lg text-cloak-muted transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            aria-label="More reactions"
          >
            ＋
          </button>
        </div>
      ) : confirmingDelete ? (
        <div className="p-2">
          <p className="px-1 py-1 text-sm font-semibold">Delete message?</p>
          <button
            type="button"
            onClick={() => onAction("delete-me")}
            className={rowClass}
          >
            <span className="min-w-0 flex-1 truncate">Delete for me</span>
          </button>
          {outgoing && (
            <button
              type="button"
              onClick={() => onAction("delete-everyone")}
              className={`${rowClass} text-cloak-danger`}
            >
              <span className="min-w-0 flex-1 truncate">Delete for everyone</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirmingDelete(false)}
            className={`${rowClass} text-cloak-muted`}
          >
            <span className="min-w-0 flex-1 truncate">Cancel</span>
          </button>
        </div>
      ) : (
        items.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.id}>
              {item.divider && (
                <div className="my-1 border-t border-neutral-800" role="separator" />
              )}
              <button
                ref={index === 0 ? firstFocusRef : undefined}
                type="button"
                role="menuitem"
                onClick={() => run(item)}
                className={`${rowClass} ${
                  item.danger
                    ? "text-cloak-danger hover:text-red-400"
                    : "text-cloak-text"
                }`}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
              </button>
            </div>
          );
        })
      )}
    </div>
  );

  // Desktop: floating popover with smart bounds detection.
  if (isDesktop && position) {
    return (
      <div
        className="fixed inset-0 z-[95]"
        style={{ backdropFilter: "blur(2px)" }}
        role="presentation"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0"
          onContextMenu={(event) => event.preventDefault()}
        />
        <div
          className="fixed"
          style={{ top: position.top, left: position.left }}
          data-placement={position.placement}
        >
          {panel}
        </div>
      </div>
    );
  }

  // Mobile: bottom sheet, blurred backdrop.
  return (
    <div className="fixed inset-0 z-[95] flex items-end" role="presentation">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50"
        style={{ backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        onClick={onClose}
      />
      <div className="relative w-full rounded-t-3xl p-2 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/20" />
        {panel}
      </div>
    </div>
  );
}
