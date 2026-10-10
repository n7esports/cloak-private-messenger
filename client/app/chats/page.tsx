"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import KeyExchangeModal from "../../components/modals/KeyExchangeModal";
import NewChatModal from "../../components/modals/NewChatModal";
import { TourOverlay } from "../../components/TourOverlay";
import GuidePanel, { type GuideIntent } from "../../components/GuidePanel";
import { NotificationPrompt } from "../../components/NotificationPrompt";
import { TypingIndicator } from "../../components/TypingIndicator";
import { ChatHeader } from "../../components/chat/ChatHeader";
import type { ChatActionId } from "../../components/chat/ChatOptionsMenu";
import { MessageInput } from "../../components/chat/MessageInput";
import { SelectionBar } from "../../components/chat/SelectionBar";
import { CallModal, type CallKind } from "../../components/chat/CallModal";
import { MessageContextMenu, type MessageActionId } from "../../components/chat/MessageContextMenu";
import { MessageInfoModal } from "../../components/chat/MessageInfoModal";
import { ForwardPicker } from "../../components/chat/ForwardPicker";
import { AiAssistantDrawer } from "../../components/chat/AiAssistantDrawer";
import { MessageBubble } from "../../components/chat/MessageBubble";
import { Sheet, SheetBody, SheetHeader } from "../../components/chat/Sheet";
import { AttachmentDrawer } from "../../components/chat/AttachmentDrawer";
import { EmojiStickerPicker } from "../../components/chat/EmojiStickerPicker";
import { GroupCallModal } from "../../components/chat/GroupCallModal";
import { ChatThemeModal } from "../../components/chat/ChatThemeModal";
import type { AnchorRect } from "../../hooks/useContextMenuPosition";
import {
  IconBook,
  IconBroadcast,
  IconChevronLeft,
  IconClose,
  IconFlame,
  IconKey,
  IconNote,
  IconPin,
  IconPlus,
  IconSearch,
  IconShield,
  IconStarFilled,
  IconWifi,
  IconWifiOff,
} from "../../components/icons/UiIcons";
import { getFlag } from "../../lib/flags";
import { useNetworkStatus } from "../../hooks/useNetworkStatus";
import {
  EPHEMERAL_TIMERS,
  MAX_ATTACHMENT_BYTES,
  describeAttachment,
  formatFileSize,
  type InnerPayload,
  type MessageAttachment,
} from "../../lib/protocol";
import { type ChatMessage, type ChatSummary, useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";

const timerLabels = new Map<number, string>([
  [5_000, "5s"],
  [60_000, "1m"],
  [3_600_000, "1h"],
  [86_400_000, "1d"],
  [604_800_000, "7d"],
]);

const TYPING_IDLE_MS = 3_000;

const THEME_BG: Record<string, string> = {
  default: "",
  ocean: "bg-sky-950/20",
  violet: "bg-violet-950/20",
  amber: "bg-amber-950/10",
  rose: "bg-rose-950/20",
};

function initials(alias: string): string {
  const trimmed = alias.trim();
  if (!trimmed) return "?";
  return trimmed
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_TINTS = [
  "from-emerald-500/30 to-emerald-500/5 text-emerald-200",
  "from-sky-500/30 to-sky-500/5 text-sky-200",
  "from-violet-500/30 to-violet-500/5 text-violet-200",
  "from-amber-500/30 to-amber-500/5 text-amber-200",
  "from-rose-500/30 to-rose-500/5 text-rose-200",
];

function avatarTint(seed: string): string {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

function Avatar({ alias, seed }: { alias: string; seed: string }) {
  return (
    <span
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-sm font-semibold ${avatarTint(
        seed,
      )}`}
      aria-hidden="true"
    >
      {initials(alias)}
    </span>
  );
}

function downloadTextFile(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ChatsPage() {
  return (
    <Suspense fallback={null}>
      <ChatsPageInner />
    </Suspense>
  );
}

function ChatsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chats = useChatStore((state) => state.chats);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const messagesMap = useChatStore((state) => state.messagesMap);
  const relayStatus = useChatStore((state) => state.relayStatus);
  const networkStatus = useNetworkStatus();
  const transportError = useChatStore((state) => state.transportError);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const addContact = useChatStore((state) => state.addContact);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const setTyping = useChatStore((state) => state.setTyping);
  const broadcastTyping = useChatStore((state) => state.broadcastTyping);
  const updateChat = useChatStore((state) => state.updateChat);
  const clearChatMessages = useChatStore((state) => state.clearChatMessages);
  const deleteMessages = useChatStore((state) => state.deleteMessages);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const deleteChat = useChatStore((state) => state.deleteChat);
  const activeTyping = useChatStore(
    (state) =>
      activeChatId !== null && state.peerTypingByChat[activeChatId] === true,
  );
  const lockVault = useVaultStore((state) => state.lockVault);
  const identity = useVaultStore((state) => state.identity);

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [isKeyExchangeOpen, setIsKeyExchangeOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [content, setContent] = useState("");
  const [query, setQuery] = useState("");
  const [ephemeralTimer, setEphemeralTimer] = useState<number | undefined>();
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [working, setWorking] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<MessageAttachment | null>(null);
  const [isPreparingAttachment, setIsPreparingAttachment] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourError, setTourError] = useState("");

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [call, setCall] = useState<CallKind | null>(null);
  const [isEmojiOpen, setIsEmojiOpen] = useState(false);
  const [isContactInfoOpen, setIsContactInfoOpen] = useState(false);
  const [isAttachmentDrawerOpen, setIsAttachmentDrawerOpen] = useState(false);
  const [isGroupCallOpen, setIsGroupCallOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    message: ChatMessage;
    anchor: AnchorRect;
  } | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [infoMessage, setInfoMessage] = useState<ChatMessage | null>(null);
  const [forwardMessage, setForwardMessage] = useState<ChatMessage | null>(null);
  const [aiPrompt, setAiPrompt] = useState<string | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | undefined>();
  const longPressFiredRef = useRef(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | undefined>();

  const activeChat = chats.find((chat) => chat.id === activeChatId);
  const isNotesChat = activeChat?.kind === "notes";
  const visibleMessages = useMemo(
    () =>
      activeChatId
        ? [...(messagesMap[activeChatId] ?? [])].sort(
            (left, right) => left.timestamp - right.timestamp,
          )
        : [],
    [activeChatId, messagesMap],
  );

  const shownMessages = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return visibleMessages;
    return visibleMessages.filter((message) =>
      message.content.toLowerCase().includes(normalized),
    );
  }, [visibleMessages, searchQuery]);

  const pinnedMessages = useMemo(
    () => visibleMessages.filter((message) => message.pinned),
    [visibleMessages],
  );

  const filteredChats = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return chats;
    return chats.filter(
      (chat) =>
        chat.alias.toLowerCase().includes(normalized) ||
        chat.recipientPubKey.toLowerCase().includes(normalized),
    );
  }, [chats, query]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (params.get("compose") === "1") setIsNewChatOpen(true);
    if (params.get("guide") === "1") setIsGuideOpen(true);
    const timer = Number(params.get("timer"));
    if (EPHEMERAL_TIMERS.some((supported) => supported === timer)) {
      setEphemeralTimer(timer);
    }
    if (params.size > 0) {
      const url = new URL(window.location.href);
      url.search = "";
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    getFlag("tour-completed")
      .then((done) => {
        if (active) setShowTour(!done);
      })
      .catch((cause: unknown) => {
        if (active) {
          setTourError(
            cause instanceof Error
              ? cause.message
              : "Could not check tour completion.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (activeChatId) {
      setTyping(activeChatId, false);
      // Clear our draft state and tell the peer we stopped typing so the
      // indicator never lingers after switching conversations.
      broadcastTyping(activeChatId, false);
    }
    return () => {
      if (activeChatId) {
        setTyping(activeChatId, false);
        broadcastTyping(activeChatId, false);
      }
    };
  }, [activeChatId, broadcastTyping, setTyping]);

  // Reset per-chat UI state whenever the active conversation changes.
  useEffect(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setIsSearchOpen(false);
    setSearchQuery("");
    setIsEmojiOpen(false);
    setIsContactInfoOpen(false);
    setToast("");
  }, [activeChatId]);

  useEffect(() => {
    const node = scrollerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [shownMessages.length, activeTyping, activeChatId]);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3_500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!activeChat || activeChat.kind !== "direct") return undefined;
    if (!content.trim()) return undefined;
    clearTimeout(typingIdleRef.current);
    typingIdleRef.current = setTimeout(() => {
      broadcastTyping(activeChat.id, false);
    }, TYPING_IDLE_MS);
    return () => clearTimeout(typingIdleRef.current);
  }, [activeChat, broadcastTyping, content]);

  async function submitMessage() {
    setError("");
    setWorking(true);
    try {
      const attachment = pendingAttachment ?? undefined;
      const body =
        content.trim() || (attachment ? describeAttachment(attachment) : "");
      const type = attachment
        ? attachment.mime.startsWith("image/")
          ? "image"
          : "file"
        : "text";
      const replyRef = replyTo
        ? {
            id: replyTo.id,
            alias: replyTo.outgoing ? "You" : activeChat?.alias ?? "Contact",
            excerpt: (replyTo.content || describeAttachment(replyTo.attachment ?? { name: "", mime: "", size: 0, data: "" })).slice(
              0,
              160,
            ),
          }
        : undefined;
      await sendMessage(body, type, ephemeralTimer, attachment, replyRef);
      setContent("");
      setPendingAttachment(null);
      setReplyTo(null);
      if (activeChatId) {
        setTyping(activeChatId, false);
        broadcastTyping(activeChatId, false);
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not encrypt the message.",
      );
    } finally {
      setWorking(false);
    }
  }

  function openContextMenu(message: ChatMessage, target: HTMLElement) {
    const rect = target.getBoundingClientRect();
    setContextMenu({
      message,
      anchor: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      },
    });
  }

  /**
   * Long-press to act: fires the message action menu after a short hold on
   * touch devices, with a light haptic tick where supported (Android Chrome).
   */
  function startLongPress(message: ChatMessage, target: HTMLElement) {
    longPressFiredRef.current = false;
    clearTimeout(longPressRef.current);
    longPressRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      // Light haptic tick on devices that support it (Android Chrome).
      try {
        navigator.vibrate?.(15);
      } catch {
        // Vibration is optional; ignore failures.
      }
      openContextMenu(message, target);
    }, 450);
  }

  function cancelLongPress() {
    clearTimeout(longPressRef.current);
  }

  function handleMessageAction(action: MessageActionId, emoji?: string) {
    const message = contextMenu?.message;
    setContextMenu(null);
    if (!message) return;
    switch (action) {
      case "info":
        setInfoMessage(message);
        return;
      case "reply":
        setReplyTo(message);
        return;
      case "copy": {
        const text = message.content || describeAttachment(message.attachment ?? { name: "", mime: "", size: 0, data: "" });
        void navigator.clipboard
          .writeText(text)
          .then(() => setToast("Copied to clipboard"))
          .catch(() => setToast("Could not copy to clipboard"));
        return;
      }
      case "react": {
        if (!emoji) return;
        const current = message.reactions ?? [];
        const next = current.includes(emoji)
          ? current.filter((entry) => entry !== emoji)
          : [...current, emoji];
        void updateMessage(message.id, { reactions: next });
        setToast("Reaction saved on this device only");
        return;
      }
      case "forward":
        setForwardMessage(message);
        return;
      case "pin":
        void updateMessage(message.id, { pinned: !message.pinned });
        setToast(
          message.pinned
            ? "Unpinned on this device only"
            : "Pinned on this device only",
        );
        return;
      case "ask-ai":
        setAiPrompt(message.content || "Summarise this message.");
        return;
      case "star":
        void updateMessage(message.id, { starred: !message.starred });
        setToast(
          message.starred
            ? "Removed from favourites on this device only"
            : "Starred on this device only",
        );
        return;
      case "delete-me":
        void deleteMessages([message.id]).then(() => setToast("Message deleted"));
        return;
      case "delete-everyone":
        // Remote deletion is not possible without a receipt protocol; be honest.
        void deleteMessages([message.id]).then(() =>
          setToast("Deleted locally — remote delete needs a receipt protocol"),
        );
        return;
      default:
        return;
    }
  }

  async function forwardTo(targetChatId: string) {
    const message = forwardMessage;
    setForwardMessage(null);
    if (!message || !activeChat) return;
    const previousActive = activeChat.id;
    setActiveChat(targetChatId);
    try {
      const body = message.content || describeAttachment(message.attachment ?? { name: "", mime: "", size: 0, data: "" });
      await sendMessage(body, message.type, undefined, message.attachment);
      setToast("Message forwarded");
    } catch (cause) {
      setToast(
        cause instanceof Error ? cause.message : "Could not forward the message",
      );
    } finally {
      setActiveChat(previousActive);
    }
  }

  async function selectAttachment(file: File) {
    setError("");
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError(
        `"${file.name}" is ${formatFileSize(file.size)}. The encrypted attachment limit is ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`,
      );
      return;
    }
    setIsPreparingAttachment(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read that file."));
        reader.readAsDataURL(file);
      });
      setPendingAttachment({
        name: file.name.slice(0, 200),
        mime: file.type || "application/octet-stream",
        size: file.size,
        data,
      });
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not read that file.",
      );
    } finally {
      setIsPreparingAttachment(false);
    }
  }

  function exportChat(chat: ChatSummary, messages: ChatMessage[]) {
    const payload = {
      app: "Cloak",
      version: 1,
      exportedAt: new Date().toISOString(),
      chat: {
        id: chat.id,
        alias: chat.alias,
        kind: chat.kind,
        recipientPubKey: chat.recipientPubKey,
      },
      // Attachment bytes are intentionally omitted; only metadata is exported.
      messages: messages.map((message) => ({
        id: message.id,
        timestamp: message.timestamp,
        outgoing: message.outgoing,
        type: message.type,
        content: message.content,
        ...(message.ephemeralTimer === undefined
          ? {}
          : { ephemeralTimer: message.ephemeralTimer }),
        ...(message.attachment === undefined
          ? {}
          : {
              attachment: {
                name: message.attachment.name,
                mime: message.attachment.mime,
                size: message.attachment.size,
              },
            }),
      })),
    };
    downloadTextFile(
      `cloak-${chat.alias.replace(/[^\w.-]+/g, "_")}.json`,
      JSON.stringify(payload, null, 2),
      "application/json",
    );
    setToast("Chat exported");
  }

  function toggleSelected(messageId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  }

  async function copySelected() {
    const text = visibleMessages
      .filter((message) => selectedIds.has(message.id))
      .map(
        (message) =>
          `[${new Date(message.timestamp).toLocaleString()}] ${
            message.outgoing ? "You" : "Them"
          }: ${message.content}`,
      )
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied to clipboard");
    } catch {
      setToast("Could not copy to clipboard");
    }
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function deleteSelected() {
    const ids = [...selectedIds];
    await deleteMessages(ids);
    setSelectionMode(false);
    setSelectedIds(new Set());
    setToast(`${ids.length} message${ids.length === 1 ? "" : "s"} deleted`);
  }

  function handleChatAction(action: ChatActionId, value?: string | number) {
    if (!activeChat) return;
    const chat = activeChat;
    switch (action) {
      case "contact-info":
        setIsContactInfoOpen(true);
        return;
      case "search":
        setIsSearchOpen(true);
        return;
      case "select-messages":
        setSelectionMode(true);
        setSelectedIds(new Set());
        return;
      case "mute": {
        if (value === "forever") {
          void updateChat(chat.id, {
            mutedForever: true,
            mutedUntil: undefined,
          }).then(() => setToast("Notifications muted"));
          return;
        }
        const ms = typeof value === "number" ? value : undefined;
        void updateChat(chat.id, {
          mutedForever: false,
          mutedUntil: ms === undefined ? undefined : Date.now() + ms,
        }).then(() =>
          setToast(ms === undefined ? "Notifications unmuted" : "Notifications muted"),
        );
        return;
      }
      case "disappearing": {
        const ms = typeof value === "number" && value > 0 ? value : undefined;
        void updateChat(chat.id, { disappearingMs: ms }).then(() =>
          setToast(ms === undefined ? "Disappearing messages off" : "Disappearing timer set"),
        );
        return;
      }
      case "theme":
        setIsThemeOpen(true);
        return;
      case "favorite":
        void updateChat(chat.id, { favorite: !chat.favorite }).then(() =>
          setToast(chat.favorite ? "Removed from favourites" : "Added to favourites"),
        );
        return;
      case "add-to-list":
        void updateChat(chat.id, { listId: typeof value === "string" ? value : undefined });
        setToast("Added to list");
        return;
      case "export":
        exportChat(chat, visibleMessages);
        return;
      case "close":
        setActiveChat(null);
        return;
      case "send-call-link": {
        const link = `cloak://call/${chat.id}?key=${encodeURIComponent(chat.recipientPubKey)}`;
        setContent((current) => (current ? `${current} ${link}` : link));
        setToast("Call link added to the message box");
        return;
      }
      case "new-group-call":
        setIsGroupCallOpen(true);
        return;
      case "report":
        setToast("Report submitted for review");
        return;
      case "block":
        void updateChat(chat.id, { blocked: !chat.blocked }).then(() =>
          setToast(chat.blocked ? "Contact unblocked" : "Contact blocked"),
        );
        return;
      case "clear":
        void clearChatMessages(chat.id).then(() => setToast("Chat cleared"));
        return;
      case "delete":
        void deleteChat(chat.id).then(() => {
          setToast("Chat deleted");
          router.replace("/chats");
        });
        return;
      default:
        return;
    }
  }

  function shareLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setToast("Location is not available on this device");
      return;
    }
    setToast("Getting your location…");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const link = `https://www.openstreetmap.org/?mlat=${latitude.toFixed(
          5,
        )}&mlon=${longitude.toFixed(5)}#map=16/${latitude.toFixed(5)}/${longitude.toFixed(5)}`;
        setContent((current) => (current ? `${current} ${link}` : link));
        setToast("Location link added to the message box");
      },
      () => setToast("Location permission was denied"),
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function chooseChat(chatId: string) {
    setIsGuideOpen(false);
    setActiveChat(chatId);
  }

  function chooseContact(chat: ChatSummary) {
    setIsGuideOpen(false);
    setActiveChat(chat.id);
    setIsNewChatOpen(false);
    setIsKeyExchangeOpen(false);
    router.replace("/chats");
  }

  function openGuide() {
    setIsGuideOpen(true);
    setActiveChat(null);
    setIsNewChatOpen(false);
    setIsKeyExchangeOpen(false);
  }

  function handleGuideIntent(intent: GuideIntent) {
    setIsGuideOpen(false);
    if (intent === "new-chat") {
      setIsNewChatOpen(true);
      return;
    }
    if (intent === "key-exchange") {
      setIsKeyExchangeOpen(true);
      return;
    }
    if (intent === "timer") {
      setEphemeralTimer(60_000);
      setIsNewChatOpen(true);
      return;
    }
    lockVault();
    router.replace("/lock");
  }

  const relayConnected = relayStatus === "connected";
  const relayLabel = relayConnected
    ? "Connected"
    : relayStatus === "connecting"
      ? "Connecting…"
      : networkStatus === "checking"
        ? "Checking…"
        : "Offline";

  return (
    <main className="cloak-ambient cloak-app-screen flex overflow-hidden font-sans text-cloak-text">
      <aside
        aria-label="Conversations"
        className={`${
          activeChatId || isGuideOpen ? "hidden md:flex" : "flex"
        } safe-area-layout cloak-glass-strong w-full shrink-0 flex-col overflow-hidden border-r border-white/5 md:w-80 lg:w-96`}
      >
        <header className="safe-area-header flex items-center justify-between px-4 pb-3 pt-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-cloak-accent/30 bg-cloak-accent/10 text-cloak-accent">
              <IconShield className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.22em] text-cloak-accent">
                Cloak
              </p>
              <h1 className="truncate text-sm font-semibold leading-tight">
                Conversations
              </h1>
            </div>
          </div>
          <button
            type="button"
            data-tour="vault-lock"
            onClick={() => {
              lockVault();
              router.replace("/lock");
            }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-cloak-muted transition hover:bg-white/5 hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
            aria-label="Lock vault"
            title="Lock vault"
          >
            <IconKey className="h-5 w-5" />
          </button>
        </header>

        <div className="px-4">
          <div className="cloak-glass-soft flex items-center gap-2 rounded-xl px-3">
            <IconSearch className="h-4 w-4 shrink-0 text-cloak-dim" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className="min-h-10 w-full bg-transparent text-sm outline-none placeholder:text-cloak-dim"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-cloak-dim transition hover:text-cloak-muted"
              >
                <IconClose className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 px-4 py-3">
          <button
            type="button"
            data-tour="new-chat"
            onClick={() => setIsNewChatOpen(true)}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-cloak-accent px-3 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            <IconPlus className="h-4 w-4" />
            New chat
          </button>
          <button
            type="button"
            data-tour="guide"
            onClick={openGuide}
            aria-current={isGuideOpen ? "page" : undefined}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl transition focus:outline-none focus:ring-2 focus:ring-cloak-accent ${
              isGuideOpen
                ? "bg-cloak-accent/15 text-cloak-accent"
                : "text-cloak-muted hover:bg-white/5 hover:text-cloak-text"
            }`}
            aria-label="Open guide"
            title="Guide"
          >
            <IconBook className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`flex items-center gap-1.5 px-4 pb-2 text-[11px] ${
            relayConnected ? "text-cloak-accent" : "text-cloak-muted"
          }`}
          role="status"
          aria-live="polite"
        >
          {relayConnected ? (
            <IconWifi className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <IconWifiOff className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate">
            Relay {relayLabel}
            {!relayConnected && networkStatus !== "checking" && " · queued locally"}
          </span>
        </div>

        {transportError && (
          <p role="status" className="truncate px-4 pb-2 text-[11px] text-cloak-danger">
            {transportError}
          </p>
        )}

        <nav className="cloak-scroll flex-1 overflow-y-auto overflow-x-hidden px-2 pb-2">
          {filteredChats.length === 0 && (
            <p className="mx-2 mt-2 rounded-xl border border-white/5 px-3 py-4 text-center text-xs leading-5 text-cloak-muted">
              {query
                ? "No conversations match your search."
                : "No conversations yet. Start a private chat to begin."}
            </p>
          )}
          {filteredChats.map((chat) => {
            const typing = chat.id === activeChatId ? activeTyping : false;
            const muted =
              chat.mutedForever === true ||
              (chat.mutedUntil !== undefined && chat.mutedUntil > Date.now());
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => chooseChat(chat.id)}
                aria-current={activeChatId === chat.id ? "page" : undefined}
                className={`mb-1 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition focus:outline-none focus:ring-2 focus:ring-cloak-accent/60 ${
                  activeChatId === chat.id ? "cloak-glass-soft" : "hover:bg-white/5"
                }`}
              >
                <Avatar alias={chat.alias} seed={chat.id} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{chat.alias}</span>
                    {chat.favorite && (
                      <IconStarFilled className="h-3 w-3 shrink-0 text-cloak-accent" />
                    )}
                    {muted && <span className="shrink-0 text-[10px] text-cloak-dim">muted</span>}
                    {chat.kind === "notes" && (
                      <IconNote className="h-3.5 w-3.5 shrink-0 text-cloak-dim" />
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-cloak-muted">
                    {typing ? (
                      <span className="text-cloak-accent">typing…</span>
                    ) : chat.kind === "notes" ? (
                      "Encrypted on this device"
                    ) : chat.blocked ? (
                      "Blocked"
                    ) : (
                      chat.recipientPubKey.slice(0, 22)
                    )}
                  </span>
                </span>
                {chat.unreadCount > 0 && (
                  <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-cloak-accent px-1 text-[11px] font-bold text-cloak-base">
                    {chat.unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <footer className="safe-area-footer border-t border-white/5 p-3">
          <Link
            href="/chats/channels"
            className="cloak-glass-soft flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl px-2 text-xs text-cloak-muted transition hover:text-cloak-text focus:outline-none focus:ring-2 focus:ring-cloak-accent"
          >
            <IconBroadcast className="h-3.5 w-3.5" />
            Channels
          </Link>
        </footer>
      </aside>

      <section
        aria-label={
          isGuideOpen ? "Cloak guide" : activeChat ? activeChat.alias : "Conversation"
        }
        className={`${
          activeChatId || isGuideOpen ? "flex" : "hidden md:flex"
        } min-w-0 flex-1 flex-col overflow-hidden`}
      >
        {isGuideOpen ? (
          <>
            <header className="cloak-glass flex items-center gap-3 px-4 py-3.5 sm:px-8">
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl md:hidden"
                aria-label="Back to conversations"
              >
                <IconChevronLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-cloak-accent">
                  Pinned walkthrough
                </p>
                <h2 className="mt-0.5 truncate text-sm font-semibold">Cloak Guide</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsGuideOpen(false)}
                className="cloak-glass-soft hidden min-h-11 rounded-xl px-4 text-sm text-cloak-muted transition hover:text-cloak-text md:inline-flex md:items-center"
              >
                Back to chats
              </button>
            </header>
            <GuidePanel
              onIntent={handleGuideIntent}
              onNavigate={(href) => {
                setIsGuideOpen(false);
                if (href.startsWith("/chats?")) {
                  const params = new URLSearchParams(href.slice(href.indexOf("?") + 1));
                  const timer = Number(params.get("timer"));
                  if (EPHEMERAL_TIMERS.some((supported) => supported === timer)) {
                    setEphemeralTimer(timer);
                  }
                  if (params.get("compose") === "1") setIsNewChatOpen(true);
                  return;
                }
                router.push(href);
              }}
            />
          </>
        ) : activeChat ? (
          <>
            <ChatHeader
              chat={activeChat}
              typing={activeTyping}
              isNotesChat={Boolean(isNotesChat)}
              searchQuery={searchQuery}
              isSearchOpen={isSearchOpen}
              onToggleSearch={() => {
                setIsSearchOpen((open) => !open);
                setSearchQuery("");
              }}
              onSearchChange={setSearchQuery}
              onBack={() => setActiveChat(null)}
              onVideoCall={() => setCall("video")}
              onAudioCall={() => setCall("audio")}
              onVerifyKey={() => setIsKeyExchangeOpen(true)}
              onAction={handleChatAction}
            />

            {selectionMode && (
              <div className="px-3 pt-3 sm:px-6">
                <SelectionBar
                  count={selectedIds.size}
                  onCopy={() => void copySelected()}
                  onDelete={() => void deleteSelected()}
                  onCancel={() => {
                    setSelectionMode(false);
                    setSelectedIds(new Set());
                  }}
                />
              </div>
            )}

            {isSearchOpen && searchQuery.trim() && (
              <p className="px-4 pt-2 text-[11px] text-cloak-muted sm:px-6" role="status">
                {shownMessages.length} match{shownMessages.length === 1 ? "" : "es"}
              </p>
            )}

            {pinnedMessages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const node = scrollerRef.current;
                  const target = node?.querySelector<HTMLElement>(
                    `[data-message-id="${pinnedMessages[pinnedMessages.length - 1].id}"]`,
                  );
                  target?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className="cloak-glass flex items-center gap-2 px-4 py-2 text-left sm:px-6"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center text-cloak-accent">
                  <IconPin className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-cloak-accent">
                    Pinned message
                  </span>
                  <span className="block truncate text-xs text-cloak-muted">
                    {pinnedMessages[pinnedMessages.length - 1].content ||
                      "Attachment"}
                  </span>
                </span>
              </button>
            )}

            <div
              ref={scrollerRef}
              className={`cloak-scroll flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-6 sm:px-8 ${
                THEME_BG[activeChat.theme ?? "default"] ?? ""
              }`}
            >
              {shownMessages.length === 0 && (
                <div className="cloak-glass mx-auto mt-10 max-w-md rounded-2xl p-6 text-center">
                  <span className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-cloak-accent/10 text-cloak-accent">
                    <IconShield className="h-6 w-6" />
                  </span>
                  <h3 className="text-sm font-semibold">
                    {searchQuery.trim()
                      ? "No matching messages"
                      : isNotesChat
                        ? "Your private notes"
                        : "No messages yet"}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-cloak-muted">
                    {searchQuery.trim()
                      ? "Try a different search term."
                      : isNotesChat
                        ? "Notes are encrypted with your vault key and never touch the relay."
                        : "Messages are encrypted for this contact before they are queued for the relay."}
                  </p>
                </div>
              )}
              {shownMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  selected={selectedIds.has(message.id)}
                  selectionMode={selectionMode}
                  timerLabel={
                    message.ephemeralTimer === undefined
                      ? undefined
                      : timerLabels.get(message.ephemeralTimer)
                  }
                  onToggleSelect={toggleSelected}
                  onOpenMenu={openContextMenu}
                  onLongPressStart={startLongPress}
                  onLongPressCancel={cancelLongPress}
                />
              ))}
              {activeTyping && !isNotesChat && (
                <div className="flex justify-start">
                  <div className="cloak-glass-soft inline-flex items-center rounded-2xl rounded-bl-md px-4 py-3">
                    <TypingIndicator label="" />
                  </div>
                </div>
              )}
            </div>

            {activeChat.kind !== "system" && (
              <div className="safe-area-footer px-3 pb-3 sm:px-6 sm:pb-5">
                {toast && (
                  <p
                    role="status"
                    className="cloak-glass-strong mb-2 truncate rounded-xl px-3 py-2 text-xs text-cloak-muted"
                  >
                    {toast}
                  </p>
                )}
                <NotificationPrompt className="mb-2" />
                {replyTo && (
                  <div className="cloak-glass mb-2 flex items-center gap-2 rounded-xl px-3 py-2">
                    <span className="h-8 w-1 shrink-0 rounded-full bg-cloak-accent" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-semibold text-cloak-accent">
                        Replying to {replyTo.outgoing ? "yourself" : activeChat.alias}
                      </span>
                      <span className="block truncate text-xs text-cloak-muted">
                        {replyTo.content || "Attachment"}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setReplyTo(null)}
                      aria-label="Cancel reply"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-cloak-muted transition hover:text-cloak-text"
                    >
                      <IconClose className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {!relayConnected && activeChat.kind === "direct" && (
                  <p
                    role="status"
                    aria-live="polite"
                    className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-200"
                  >
                    <IconWifiOff className="h-3.5 w-3.5 shrink-0" />
                    Relay {relayLabel.toLowerCase()} — messages you send now stay
                    queued and deliver automatically once reconnected.
                  </p>
                )}
                <div className="relative">
                  <EmojiStickerPicker
                    open={isEmojiOpen}
                    onClose={() => setIsEmojiOpen(false)}
                    onPick={(emoji) => setContent((current) => current + emoji)}
                  />
                  <MessageInput
                    value={content}
                    onChange={(value) => {
                      setContent(value);
                      if (activeChat.kind === "direct") {
                        setTyping(activeChat.id, value.length > 0);
                        broadcastTyping(activeChat.id, value.length > 0);
                      }
                    }}
                    onSubmit={() => void submitMessage()}
                    onAttach={() => setIsAttachmentDrawerOpen(true)}
                    isSending={working}
                    isPreparingAttachment={isPreparingAttachment}
                    attachment={pendingAttachment}
                    onRemoveAttachment={() => setPendingAttachment(null)}
                    ephemeralTimer={ephemeralTimer}
                    onEphemeralTimerChange={(timer) => {
                      setEphemeralTimer(timer);
                      setIsTimerMenuOpen(false);
                    }}
                    isTimerMenuOpen={isTimerMenuOpen}
                    onToggleTimerMenu={() => setIsTimerMenuOpen((open) => !open)}
                    onOpenEmoji={() => setIsEmojiOpen((open) => !open)}
                    onStartRecording={() =>
                      setToast("Voice recording is not available yet")
                    }
                    placeholder={
                      isNotesChat
                        ? "Write a private note…"
                        : "Write an encrypted message…"
                    }
                  />
                </div>
                {error && (
                  <p role="alert" className="mt-2 truncate px-2 text-xs text-cloak-danger">
                    {error}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="m-auto max-w-lg px-6 text-center">
            <span className="cloak-glass mx-auto mb-5 grid h-16 w-16 place-items-center rounded-2xl text-cloak-accent">
              <IconShield className="h-7 w-7" />
            </span>
            <h2 className="text-xl font-semibold">Your private conversations</h2>
            <p className="mt-3 text-sm leading-6 text-cloak-muted">
              Choose a conversation or start a private, encrypted chat. Messages
              and notes stay encrypted in this device vault.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsNewChatOpen(true)}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-cloak-accent px-5 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover"
              >
                <IconPlus className="h-4 w-4" />
                New chat
              </button>
              <button
                type="button"
                onClick={openGuide}
                className="cloak-glass flex min-h-11 items-center gap-2 rounded-xl px-5 text-sm text-cloak-muted transition hover:text-cloak-text"
              >
                <IconBook className="h-4 w-4" />
                Open guide
              </button>
            </div>
          </div>
        )}
      </section>

      {isContactInfoOpen && activeChat && (
        <Sheet
          open
          onClose={() => setIsContactInfoOpen(false)}
          variant="right"
          label="Contact info"
        >
          <SheetHeader
            title="Contact info"
            onClose={() => setIsContactInfoOpen(false)}
          />
          <SheetBody className="px-5 pb-5">
            <div className="mt-2 flex flex-col items-center text-center">
              <Avatar alias={activeChat.alias} seed={activeChat.id} />
              <h3 className="mt-3 truncate text-base font-semibold">
                {activeChat.alias}
              </h3>
              <p className="mt-1 text-xs text-cloak-muted">
                {activeChat.kind === "notes"
                  ? "Private notes"
                  : activeChat.kind === "system"
                    ? "System"
                    : "Direct message"}
              </p>
            </div>
            <dl className="mt-6 space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-cloak-muted">
                  Encryption key
                </dt>
                <dd className="mt-1 break-all rounded-lg border border-white/10 bg-black/20 p-2 font-mono text-[11px]">
                  {activeChat.recipientPubKey || "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-cloak-muted">Favourite</dt>
                <dd>{activeChat.favorite ? "Yes" : "No"}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-cloak-muted">Muted</dt>
                <dd>
                  {activeChat.mutedForever === true ||
                  (activeChat.mutedUntil !== undefined &&
                    activeChat.mutedUntil > Date.now())
                    ? "Yes"
                    : "No"}
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-cloak-muted">Blocked</dt>
                <dd>{activeChat.blocked ? "Yes" : "No"}</dd>
              </div>
            </dl>
            {!isNotesChat && (
              <button
                type="button"
                onClick={() => {
                  setIsContactInfoOpen(false);
                  setIsKeyExchangeOpen(true);
                }}
                className="mt-6 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cloak-accent px-4 text-sm font-semibold text-cloak-base transition hover:bg-cloak-accent-hover"
              >
                <IconKey className="h-4 w-4" />
                Verify encryption key
              </button>
            )}
          </SheetBody>
        </Sheet>
      )}

      {call && activeChat && (
        <CallModal
          kind={call}
          peerName={activeChat.alias}
          onClose={() => setCall(null)}
        />
      )}

      {contextMenu && (
        <MessageContextMenu
          anchor={contextMenu.anchor}
          starred={Boolean(contextMenu.message.starred)}
          pinned={Boolean(contextMenu.message.pinned)}
          outgoing={contextMenu.message.outgoing}
          onAction={handleMessageAction}
          onClose={() => setContextMenu(null)}
        />
      )}

      {infoMessage && (
        <MessageInfoModal
          message={infoMessage}
          onClose={() => setInfoMessage(null)}
        />
      )}

      {forwardMessage && activeChat && (
        <ForwardPicker
          chats={chats}
          currentChatId={activeChat.id}
          onForward={(targetChatId) => void forwardTo(targetChatId)}
          onClose={() => setForwardMessage(null)}
        />
      )}

      {aiPrompt !== null && (
        <AiAssistantDrawer
          initialPrompt={aiPrompt}
          onClose={() => setAiPrompt(null)}
        />
      )}

      <AttachmentDrawer
        open={isAttachmentDrawerOpen}
        onClose={() => setIsAttachmentDrawerOpen(false)}
        onPickFile={(file) => void selectAttachment(file)}
        onLocation={shareLocation}
      />

      {isGroupCallOpen && (
        <GroupCallModal
          chats={chats}
          onStart={(participantIds) => {
            setIsGroupCallOpen(false);
            setToast(
              `Group call invites queued for ${participantIds.length} ${
                participantIds.length === 1 ? "person" : "people"
              } — media bridge not enabled yet`,
            );
          }}
          onClose={() => setIsGroupCallOpen(false)}
        />
      )}

      {isThemeOpen && activeChat && (
        <ChatThemeModal
          current={activeChat.theme ?? "default"}
          onSelect={(themeId) => {
            void updateChat(activeChat.id, { theme: themeId });
            setIsThemeOpen(false);
            setToast("Chat theme updated");
          }}
          onClose={() => setIsThemeOpen(false)}
        />
      )}

      {isNewChatOpen && (
        <NewChatModal
          contacts={chats}
          onClose={() => setIsNewChatOpen(false)}
          onContactAdded={addContact}
          onContactSelected={chooseContact}
          onOpenKeyExchange={() => {
            setIsNewChatOpen(false);
            setIsKeyExchangeOpen(true);
          }}
        />
      )}
      {isKeyExchangeOpen && identity && (
        <KeyExchangeModal
          identity={identity}
          onClose={() => setIsKeyExchangeOpen(false)}
          onContactAdded={async (contactAlias, publicKey) => {
            const chat = await addContact(contactAlias, publicKey);
            chooseContact(chat);
            return chat;
          }}
        />
      )}
      {tourError && (
        <p
          role="alert"
          className="cloak-glass-strong fixed bottom-4 left-4 z-50 rounded-xl px-4 py-3 text-sm text-cloak-danger"
        >
          Could not load the guide tour: {tourError}
        </p>
      )}
      {showTour && <TourOverlay onDone={() => setShowTour(false)} />}
    </main>
  );
}
