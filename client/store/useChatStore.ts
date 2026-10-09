"use client";

import { create } from "zustand";
import {
  decryptVaultPayload,
  encryptVaultPayload,
  initCrypto,
  type IdentityKeys,
} from "../lib/crypto";
import {
  EPHEMERAL_TIMERS,
  buildEnvelope,
  buildTypingSignal,
  createRatchetSession,
  decodeBytes,
  describeAttachment,
  encodeBytes,
  getExpiredMessageIds,
  isValidAttachment,
  openEnvelope,
  openTypingSignal,
  rotateSessionKey,
  signEnvelope,
  verifySignedEnvelope,
  type InnerPayload,
  type MessageAttachment,
  type RatchetSession,
  type SignedEnvelope,
  type TypingSignal,
} from "../lib/protocol";
import {
  transportManager,
  type RelayStatus,
} from "../lib/transport";
import {
  database,
  type EncryptedChatRecord,
  type EncryptedMessageRecord,
} from "../lib/vault";
import {
  registerMemoryKeyCleanup,
  useVaultStore,
} from "./useVaultStore";

export const PRIVATE_NOTES_CHAT_ID = "private-notes";
export const WELCOME_CHAT_ID = "welcome-guide";

export type MessageStatus = "queued" | "sent" | "delivered" | "read";
export type ChatKind = "direct" | "system" | "notes";

export interface ChatSummary {
  id: string;
  recipientPubKey: string;
  alias: string;
  unreadCount: number;
  updatedAt: number;
  kind: ChatKind;
  pinned: boolean;
  favorite?: boolean;
  mutedUntil?: number;
  disappearingMs?: number;
  theme?: string;
  listId?: string;
  blocked?: boolean;
}

export interface MessageReplyRef {
  id: string;
  alias: string;
  excerpt: string;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderPubKey: string;
  content: string;
  type: InnerPayload["type"];
  status: MessageStatus;
  timestamp: number;
  outgoing: boolean;
  ephemeralTimer?: number;
  attachment?: MessageAttachment;
  starred?: boolean;
  pinned?: boolean;
  reactions?: string[];
  replyTo?: MessageReplyRef;
}

export interface ChatState {
  activeChatId: string | null;
  chats: ChatSummary[];
  messagesMap: Record<string, ChatMessage[]>;
  isRelayConnected: boolean;
  relayStatus: RelayStatus;
  transportError: string | null;
  typingByChat: Record<string, boolean>;
  peerTypingByChat: Record<string, boolean>;
  typingSentAt: Record<string, number>;
  setRelayStatus: (status: RelayStatus) => void;
  setActiveChat: (chatId: string | null) => void;
  addContact: (alias: string, recipientPubKey: string) => Promise<ChatSummary>;
  sendMessage: (
    content: string,
    type?: InnerPayload["type"],
    ephemeralTimer?: number,
    attachment?: MessageAttachment,
    replyTo?: MessageReplyRef,
  ) => Promise<ChatMessage>;
  receiveMessage: (packet: SignedEnvelope) => Promise<void>;
  receiveTyping: (signal: TypingSignal) => Promise<void>;
  broadcastTyping: (chatId: string, isTyping: boolean) => void;
  markAsRead: (chatId: string) => Promise<void>;
  setTyping: (chatId: string, isTyping: boolean) => void;
  loadChats: () => Promise<void>;
  ensurePrivateNotes: () => Promise<ChatSummary>;
  updateChat: (chatId: string, patch: Partial<ChatSummary>) => Promise<ChatSummary | null>;
  clearChatMessages: (chatId: string) => Promise<void>;
  deleteMessages: (messageIds: string[]) => Promise<void>;
  updateMessage: (
    messageId: string,
    patch: Partial<Pick<ChatMessage, "starred" | "pinned" | "reactions">>,
  ) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  updateDeliveryStatus: (
    messageId: string,
    status: Exclude<MessageStatus, "queued">,
  ) => Promise<void>;
}

interface StoredMessage {
  senderPubKey: string;
  content: string;
  type: InnerPayload["type"];
  status: MessageStatus;
  outgoing: boolean;
  ephemeralTimer?: number;
  attachment?: MessageAttachment;
  starred?: boolean;
  pinned?: boolean;
  reactions?: string[];
  replyTo?: MessageReplyRef;
}

const messageStatusRank: Record<MessageStatus, number> = {
  queued: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};
const ephemeralExpiryTimers = new Map<string, ReturnType<typeof setTimeout>>();
const TYPING_THROTTLE_MS = 2_500;
const TYPING_EXPIRY_MS = 6_000;

/**
 * Fires a system notification for a new message when the app is backgrounded.
 * Notification bodies never contain message plaintext — only the sender alias
 * and a generic line — so no ciphertext-free metadata leaks to the OS tray.
 */
function notifyIncoming(chat: { alias: string; mutedUntil?: number }): void {
  if (chat.mutedUntil !== undefined && chat.mutedUntil > Date.now()) return;
  void import("../src/lib/notifications.js")
    .then(({ triggerIncomingMessageNotification }) =>
      triggerIncomingMessageNotification({
        sender: chat.alias,
        includeContent: false,
      } as { sender?: string; includeContent?: boolean }),
    )
    .catch(() => {
      // Notifications are best-effort; a failure must never break delivery.
    });
}

function getVaultMaterial(): {
  identity: IdentityKeys;
  vaultKey: Uint8Array;
} {
  const { identity, vaultKey, isUnlocked } = useVaultStore.getState();
  if (!isUnlocked || !identity || !vaultKey) {
    throw new Error("Unlock the vault before using chats.");
  }
  return { identity, vaultKey };
}

function toPlaintext(value: object): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

function isChatSummary(value: unknown): value is ChatSummary {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "recipientPubKey" in value &&
    typeof value.recipientPubKey === "string" &&
    "alias" in value &&
    typeof value.alias === "string" &&
    "unreadCount" in value &&
    typeof value.unreadCount === "number" &&
    "updatedAt" in value &&
    typeof value.updatedAt === "number" &&
    "kind" in value &&
    (value.kind === "direct" ||
      value.kind === "system" ||
      value.kind === "notes") &&
    "pinned" in value &&
    typeof value.pinned === "boolean" &&
    (!("favorite" in value) ||
      value.favorite === undefined ||
      typeof value.favorite === "boolean") &&
    (!("blocked" in value) ||
      value.blocked === undefined ||
      typeof value.blocked === "boolean") &&
    (!("mutedUntil" in value) ||
      value.mutedUntil === undefined ||
      typeof value.mutedUntil === "number") &&
    (!("disappearingMs" in value) ||
      value.disappearingMs === undefined ||
      typeof value.disappearingMs === "number") &&
    (!("theme" in value) ||
      value.theme === undefined ||
      typeof value.theme === "string") &&
    (!("listId" in value) ||
      value.listId === undefined ||
      typeof value.listId === "string")
  );
}

function isStoredMessage(value: unknown): value is StoredMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "senderPubKey" in value &&
    typeof value.senderPubKey === "string" &&
    "content" in value &&
    typeof value.content === "string" &&
    "type" in value &&
    (value.type === "text" ||
      value.type === "image" ||
      value.type === "file" ||
      value.type === "system") &&
    "status" in value &&
    (value.status === "queued" ||
      value.status === "sent" ||
      value.status === "delivered" ||
      value.status === "read") &&
    "outgoing" in value &&
    typeof value.outgoing === "boolean" &&
    (!("attachment" in value) ||
      value.attachment === undefined ||
      isValidAttachment(value.attachment)) &&
    (!("starred" in value) ||
      value.starred === undefined ||
      typeof value.starred === "boolean") &&
    (!("pinned" in value) ||
      value.pinned === undefined ||
      typeof value.pinned === "boolean") &&
    (!("reactions" in value) ||
      value.reactions === undefined ||
      (Array.isArray(value.reactions) &&
        value.reactions.every((entry) => typeof entry === "string"))) &&
    (!("replyTo" in value) ||
      value.replyTo === undefined ||
      (typeof value.replyTo === "object" &&
        value.replyTo !== null &&
        "id" in value.replyTo &&
        typeof value.replyTo.id === "string" &&
        "alias" in value.replyTo &&
        typeof value.replyTo.alias === "string" &&
        "excerpt" in value.replyTo &&
        typeof value.replyTo.excerpt === "string")) &&
    (!("ephemeralTimer" in value) ||
      value.ephemeralTimer === undefined ||
      (typeof value.ephemeralTimer === "number" &&
        EPHEMERAL_TIMERS.some((timer) => timer === value.ephemeralTimer)))
  );
}

async function saveEncryptedChat(
  chat: ChatSummary,
  vaultKey: Uint8Array,
): Promise<void> {
  const plaintext = toPlaintext(chat);
  try {
    const encrypted = await encryptVaultPayload(plaintext, vaultKey);
    await database.chats.put({
      id: chat.id,
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      updatedAt: chat.updatedAt,
    });
  } finally {
    plaintext.fill(0);
  }
}

async function saveEncryptedMessage(
  message: ChatMessage,
  vaultKey: Uint8Array,
): Promise<void> {
  const stored: StoredMessage = {
    senderPubKey: message.senderPubKey,
    content: message.content,
    type: message.type,
    status: message.status,
    outgoing: message.outgoing,
    ...(message.ephemeralTimer === undefined
      ? {}
      : { ephemeralTimer: message.ephemeralTimer }),
    ...(message.attachment === undefined
      ? {}
      : { attachment: message.attachment }),
    ...(message.starred === undefined ? {} : { starred: message.starred }),
    ...(message.pinned === undefined ? {} : { pinned: message.pinned }),
    ...(message.reactions === undefined ? {} : { reactions: message.reactions }),
    ...(message.replyTo === undefined ? {} : { replyTo: message.replyTo }),
  };
  const plaintext = toPlaintext(stored);
  try {
    const encrypted = await encryptVaultPayload(plaintext, vaultKey);
    await database.messages.put({
      id: message.id,
      chatId: message.chatId,
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      createdAt: message.timestamp,
    });
  } finally {
    plaintext.fill(0);
  }
}

async function decryptRecord<T>(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  vaultKey: Uint8Array,
  validate: (value: unknown) => value is T,
): Promise<T> {
  const plaintext = await decryptVaultPayload(ciphertext, nonce, vaultKey);
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    if (!validate(parsed)) throw new Error("Encrypted vault record is invalid.");
    return parsed;
  } finally {
    plaintext.fill(0);
  }
}

function sortChats(chats: ChatSummary[]): ChatSummary[] {
  return [...chats].sort(
    (left, right) =>
      Number(right.pinned) - Number(left.pinned) ||
      right.updatedAt - left.updatedAt,
  );
}

function replaceChat(
  chats: ChatSummary[],
  updatedChat: ChatSummary,
): ChatSummary[] {
  return sortChats([
    ...chats.filter((chat) => chat.id !== updatedChat.id),
    updatedChat,
  ]);
}

function sessionFromRecord(value: unknown): RatchetSession | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("remotePubKey" in value) ||
    typeof value.remotePubKey !== "string" ||
    !("sendChainKey" in value) ||
    !Array.isArray(value.sendChainKey) ||
    !("receiveChainKey" in value) ||
    !Array.isArray(value.receiveChainKey) ||
    !("sendCounter" in value) ||
    typeof value.sendCounter !== "number" ||
    !("receiveCounter" in value) ||
    typeof value.receiveCounter !== "number"
  ) {
    return null;
  }
  const sendChainKey = value.sendChainKey;
  const receiveChainKey = value.receiveChainKey;
  if (
    sendChainKey.length !== 32 ||
    receiveChainKey.length !== 32 ||
    sendChainKey.some(
      (byte) =>
        typeof byte !== "number" ||
        !Number.isInteger(byte) ||
        byte < 0 ||
        byte > 255,
    ) ||
    receiveChainKey.some(
      (byte) =>
        typeof byte !== "number" ||
        !Number.isInteger(byte) ||
        byte < 0 ||
        byte > 255,
    )
  ) {
    return null;
  }
  return {
    remotePubKey: value.remotePubKey,
    sendChainKey: Uint8Array.from(sendChainKey),
    receiveChainKey: Uint8Array.from(receiveChainKey),
    sendCounter: value.sendCounter,
    receiveCounter: value.receiveCounter,
  };
}

async function getRatchetSession(
  chatId: string,
  localIdentity: IdentityKeys,
  remotePubKey: Uint8Array,
  vaultKey: Uint8Array,
): Promise<RatchetSession> {
  const id = `contact:${chatId}`;
  const saved = await database.sessions.get(id);
  if (saved) {
    const parsed = await decryptRecord<unknown>(
      saved.ciphertext,
      saved.nonce,
      vaultKey,
      (value): value is unknown => true,
    );
    const session = sessionFromRecord(parsed);
    if (
      !session ||
      session.remotePubKey !== encodeBytes(remotePubKey)
    ) {
      throw new Error("Stored contact ratchet is invalid; remove and re-add the contact.");
    }
    return session;
  }
  return createRatchetSession(
    localIdentity.encryptionPublicKey,
    localIdentity.encryptionPrivateKey,
    remotePubKey,
  );
}

async function saveRatchetSession(
  chatId: string,
  session: RatchetSession,
  vaultKey: Uint8Array,
): Promise<void> {
  const plaintext = toPlaintext({
    remotePubKey: session.remotePubKey,
    sendChainKey: Array.from(session.sendChainKey),
    receiveChainKey: Array.from(session.receiveChainKey),
    sendCounter: session.sendCounter,
    receiveCounter: session.receiveCounter,
  });
  try {
    const encrypted = await encryptVaultPayload(plaintext, vaultKey);
    await database.sessions.put({
      id: `contact:${chatId}`,
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      updatedAt: Date.now(),
    });
  } finally {
    plaintext.fill(0);
  }
}

async function loadMessages(
  chatId: string,
  records: EncryptedMessageRecord[],
  vaultKey: Uint8Array,
): Promise<ChatMessage[]> {
  const messages: ChatMessage[] = [];
  for (const record of records) {
    if (record.chatId !== chatId) continue;
    const payload = await decryptRecord<StoredMessage>(
      record.ciphertext,
      record.nonce,
      vaultKey,
      isStoredMessage,
    );
    messages.push({
      id: record.id,
      chatId,
      senderPubKey: payload.senderPubKey,
      content: payload.content,
      type: payload.type,
      status: payload.status,
      timestamp: record.createdAt,
      outgoing: payload.outgoing,
      ...(payload.ephemeralTimer === undefined
        ? {}
        : { ephemeralTimer: payload.ephemeralTimer }),
      ...(payload.attachment === undefined
        ? {}
        : { attachment: payload.attachment }),
      ...(payload.starred === undefined ? {} : { starred: payload.starred }),
      ...(payload.pinned === undefined ? {} : { pinned: payload.pinned }),
      ...(payload.reactions === undefined ? {} : { reactions: payload.reactions }),
      ...(payload.replyTo === undefined ? {} : { replyTo: payload.replyTo }),
    });
  }
  return messages.sort((left, right) => left.timestamp - right.timestamp);
}

async function expireMessage(messageId: string): Promise<void> {
  const chatId = Object.keys(useChatStore.getState().messagesMap).find((id) =>
    useChatStore
      .getState()
      .messagesMap[id].some((message) => message.id === messageId),
  );
  try {
    await database.messages.delete(messageId);
    await database.notes.delete(messageId);
    await database.outbox.delete(messageId);
    ephemeralExpiryTimers.delete(messageId);
    if (!chatId) return;
    useChatStore.setState((state) => ({
      messagesMap: {
        ...state.messagesMap,
        [chatId]: state.messagesMap[chatId].filter(
          (message) => message.id !== messageId,
        ),
      },
    }));
  } catch (error) {
    useChatStore.setState({
      transportError:
        error instanceof Error
          ? `Could not expire message: ${error.message}`
          : "Could not expire message.",
    });
  }
}

function scheduleMessageExpiry(message: ChatMessage): void {
  if (message.ephemeralTimer === undefined) return;
  const previous = ephemeralExpiryTimers.get(message.id);
  if (previous) clearTimeout(previous);
  const remaining = Math.max(
    0,
    message.timestamp + message.ephemeralTimer - Date.now(),
  );
  ephemeralExpiryTimers.set(
    message.id,
    setTimeout(() => void expireMessage(message.id), remaining),
  );
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeChatId: null,
  chats: [],
  messagesMap: {},
  isRelayConnected: false,
  relayStatus: "disconnected",
  transportError: null,
  typingByChat: {},
  peerTypingByChat: {},
  typingSentAt: {},

  setRelayStatus: (relayStatus) =>
    set({
      relayStatus,
      isRelayConnected: relayStatus === "connected",
      ...(relayStatus === "connected" ? { transportError: null } : {}),
    }),

  setActiveChat: (chatId) => {
    if (get().activeChatId === chatId) return;
    set({ activeChatId: chatId });
    if (chatId && useVaultStore.getState().isUnlocked) {
      void get()
        .markAsRead(chatId)
        .catch((error: unknown) =>
          set({
            transportError:
              error instanceof Error ? error.message : "Could not mark messages as read.",
          }),
        );
    }
  },

  addContact: async (alias, recipientPubKey) => {
    const { identity, vaultKey } = getVaultMaterial();
    const sodium = await initCrypto();
    const publicKey = decodeBytes(recipientPubKey);
    if (publicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
      throw new Error("Contact encryption public key has an invalid length.");
    }
    if (sodium.memcmp(publicKey, identity.encryptionPublicKey)) {
      throw new Error("You cannot add your own identity as a contact.");
    }
    const id = sodium.to_hex(sodium.crypto_generichash(16, publicKey, null));
    const existing = get().chats.find((chat) => chat.id === id);
    if (existing) return existing;
    const chat: ChatSummary = {
      id,
      recipientPubKey: encodeBytes(publicKey),
      alias: alias.trim() || `Contact ${id.slice(0, 8)}`,
      unreadCount: 0,
      updatedAt: Date.now(),
      kind: "direct",
      pinned: false,
    };
    await saveEncryptedChat(chat, vaultKey);
    set((state) => ({ chats: replaceChat(state.chats, chat) }));
    return chat;
  },

  sendMessage: async (content, type = "text", ephemeralTimer, attachment, replyTo) => {
    const { identity, vaultKey } = getVaultMaterial();
    const chatId = get().activeChatId;
    if (!chatId) throw new Error("Select a conversation before sending a message.");
    const chat = get().chats.find((entry) => entry.id === chatId);
    if (!chat) throw new Error("The active conversation could not be found.");
    if (!content.trim() && !attachment) {
      throw new Error("A message cannot be empty.");
    }
    if (chat.kind === "system") {
      throw new Error("The Welcome Guide is a read-only system conversation.");
    }

    const timestamp = Date.now();
    const id = crypto.randomUUID();
    const base: ChatMessage = {
      id,
      chatId,
      senderPubKey: encodeBytes(identity.signingPublicKey),
      content,
      type,
      status: chat.kind === "notes" ? "read" : "queued",
      timestamp,
      outgoing: true,
      ...(ephemeralTimer === undefined ? {} : { ephemeralTimer }),
      ...(attachment === undefined ? {} : { attachment }),
      ...(replyTo === undefined ? {} : { replyTo }),
    };

    if (chat.kind === "notes") {
      await saveEncryptedMessage(base, vaultKey);
      const notePlaintext = toPlaintext({
        content,
        type,
        ...(ephemeralTimer === undefined ? {} : { ephemeralTimer }),
        ...(attachment === undefined ? {} : { attachment }),
        ...(replyTo === undefined ? {} : { replyTo }),
      });
      try {
        const encrypted = await encryptVaultPayload(notePlaintext, vaultKey);
        await database.notes.put({
          id,
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
          updatedAt: timestamp,
        });
      } finally {
        notePlaintext.fill(0);
      }
    } else {
      const recipientPublicKey = decodeBytes(chat.recipientPubKey);
      let session = await getRatchetSession(
        chatId,
        identity,
        recipientPublicKey,
        vaultKey,
      );
      const rotated = await rotateSessionKey(session, "send");
      session = rotated.session;
      const payload: InnerPayload = {
        type,
        content,
        ...(ephemeralTimer === undefined ? {} : { ephemeralTimer }),
        ...(attachment === undefined ? {} : { attachment }),
        ...(replyTo === undefined ? {} : { replyTo }),
      };
      try {
        const envelope = await buildEnvelope(
          payload,
          recipientPublicKey,
          rotated.messageKey,
          timestamp,
        );
        const packet = await signEnvelope(envelope, identity, id);
        await saveRatchetSession(chatId, session, vaultKey);
        await saveEncryptedMessage(base, vaultKey);
        const updatedChat = { ...chat, updatedAt: timestamp };
        await saveEncryptedChat(updatedChat, vaultKey);
        set((state) => ({
          chats: replaceChat(state.chats, updatedChat),
          messagesMap: {
            ...state.messagesMap,
            [chatId]: [...(state.messagesMap[chatId] ?? []), base],
          },
        }));
        scheduleMessageExpiry(base);
        await transportManager.enqueue(packet);
        if (chat.kind === "direct") {
          void buildTypingSignal("stop", identity, recipientPublicKey)
            .then((signal) => transportManager.sendTyping(signal))
            .catch(() => {});
        }
      } finally {
        rotated.messageKey.fill(0);
        session.sendChainKey.fill(0);
      }
      return base;
    }

    await saveEncryptedChat({ ...chat, updatedAt: timestamp }, vaultKey);
    set((state) => ({
      chats: replaceChat(state.chats, { ...chat, updatedAt: timestamp }),
      messagesMap: {
        ...state.messagesMap,
        [chatId]: [...(state.messagesMap[chatId] ?? []), base],
      },
    }));
    scheduleMessageExpiry(base);
    return base;
  },

  receiveMessage: async (packet) => {
    const { identity, vaultKey } = getVaultMaterial();
    if (!(await verifySignedEnvelope(packet))) {
      throw new Error("Incoming message signature is invalid.");
    }
    const senderEncryptionKey = decodeBytes(packet.senderEncryptionPubKey);
    const senderKey = encodeBytes(senderEncryptionKey);
    // Silently drop anything from a blocked contact, but still acknowledge it
    // so the sender's delivery state does not hang.
    const blockedChat = get().chats.find(
      (entry) => entry.kind === "direct" && entry.recipientPubKey === senderKey,
    );
    if (blockedChat?.blocked) {
      try {
        await transportManager.publishReceipt(packet.id, "delivered", senderKey);
      } catch {
        // Acknowledgement is best-effort for dropped messages.
      }
      return;
    }
    const existingMessage = await database.messages.get(packet.id);
    if (existingMessage) {
      await transportManager.publishReceipt(packet.id, "delivered", senderKey);
      return;
    }
    let chat = get().chats.find(
      (entry) =>
        entry.kind === "direct" && entry.recipientPubKey === senderKey,
    );
    if (!chat) {
      chat = await get().addContact(
        `Contact ${packet.senderPubKey.slice(0, 8)}`,
        senderKey,
      );
    }
    let session = await getRatchetSession(
      chat.id,
      identity,
      senderEncryptionKey,
      vaultKey,
    );
    const rotated = await rotateSessionKey(session, "receive");
    session = rotated.session;
    let payload: InnerPayload;
    try {
      payload = await openEnvelope(
        packet.envelope,
        identity,
        rotated.messageKey,
      );
      await saveRatchetSession(chat.id, session, vaultKey);
    } finally {
      rotated.messageKey.fill(0);
      session.receiveChainKey.fill(0);
    }
    const incoming: ChatMessage = {
      id: packet.id,
      chatId: chat.id,
      senderPubKey: packet.senderPubKey,
      content: payload.content,
      type: payload.type,
      status: get().activeChatId === chat.id ? "read" : "delivered",
      timestamp: packet.envelope.timestamp,
      outgoing: false,
      ...(payload.ephemeralTimer === undefined
        ? {}
        : { ephemeralTimer: payload.ephemeralTimer }),
      ...(payload.attachment === undefined
        ? {}
        : { attachment: payload.attachment }),
      ...(payload.replyTo === undefined ? {} : { replyTo: payload.replyTo }),
    };
    await saveEncryptedMessage(incoming, vaultKey);
    const isActive = get().activeChatId === chat.id;
    const updatedChat: ChatSummary = {
      ...chat,
      updatedAt: incoming.timestamp,
      unreadCount: isActive ? 0 : chat.unreadCount + 1,
    };
    await saveEncryptedChat(updatedChat, vaultKey);
    set((state) => ({
      chats: replaceChat(state.chats, updatedChat),
      messagesMap: {
        ...state.messagesMap,
        [chat.id]: [...(state.messagesMap[chat.id] ?? []), incoming],
      },
    }));
    scheduleMessageExpiry(incoming);
    if (!isActive) {
      notifyIncoming(updatedChat);
    }
    try {
      await transportManager.publishReceipt(packet.id, "delivered", senderKey);
      if (isActive) {
        await transportManager.publishReceipt(packet.id, "read", senderKey);
      }
    } catch (error) {
      set({
        transportError:
          error instanceof Error ? error.message : "Could not acknowledge incoming message.",
      });
    }
  },

  markAsRead: async (chatId) => {
    const { vaultKey } = getVaultMaterial();
    const chat = get().chats.find((entry) => entry.id === chatId);
    if (!chat) return;
    const incoming = (get().messagesMap[chatId] ?? []).filter(
      (message) => !message.outgoing && message.status === "delivered",
    );
    if (chat.unreadCount === 0 && incoming.length === 0) return;
    const updated =
      chat.unreadCount === 0 ? chat : { ...chat, unreadCount: 0 };
    if (chat.unreadCount > 0) await saveEncryptedChat(updated, vaultKey);
    const readIds = new Set(incoming.map((message) => message.id));
    const updatedMessages = (get().messagesMap[chatId] ?? []).map((message) =>
      readIds.has(message.id) ? { ...message, status: "read" as const } : message,
    );
    for (const message of incoming) {
      await saveEncryptedMessage(
        { ...message, status: "read" },
        vaultKey,
      );
      if (chat.kind === "direct") {
        try {
          await transportManager.publishReceipt(
            message.id,
            "read",
            chat.recipientPubKey,
          );
        } catch (error) {
          set({
            transportError:
              error instanceof Error ? error.message : "Could not send read receipt.",
          });
        }
      }
    }
    set((state) => ({
      chats: replaceChat(state.chats, updated),
      messagesMap: { ...state.messagesMap, [chatId]: updatedMessages },
    }));
  },

  setTyping: (chatId, isTyping) =>
    set((state) =>
      state.typingByChat[chatId] === isTyping
        ? state
        : { typingByChat: { ...state.typingByChat, [chatId]: isTyping } },
    ),

  broadcastTyping: (chatId, isTyping) => {
    const { identity, vaultKey } = useVaultStore.getState();
    if (!identity || !vaultKey) return;
    const chat = get().chats.find((entry) => entry.id === chatId);
    if (!chat || chat.kind !== "direct") return;
    const now = Date.now();
    const lastSent = get().typingSentAt[chatId] ?? 0;
    // Throttle repeat "typing" pings but always deliver an explicit "stop".
    if (isTyping && now - lastSent < TYPING_THROTTLE_MS) return;
    set((state) => ({
      typingSentAt: { ...state.typingSentAt, [chatId]: now },
    }));
    void buildTypingSignal(
      isTyping ? "typing" : "stop",
      identity,
      decodeBytes(chat.recipientPubKey),
    )
      .then((signal) => transportManager.sendTyping(signal))
      .catch(() => {
        // Typing is best-effort and must never surface as a transport error.
      });
  },

  receiveTyping: async (signal) => {
    const { identity, vaultKey } = useVaultStore.getState();
    if (!identity || !vaultKey) return;
    const opened = await openTypingSignal(signal, identity);
    const senderKey = opened.senderEncryptionPubKey;
    let chat = get().chats.find(
      (entry) => entry.kind === "direct" && entry.recipientPubKey === senderKey,
    );
    if (!chat) {
      chat = await get().addContact(`Contact ${signal.senderPubKey.slice(0, 8)}`, senderKey);
    }
    // The remote peer's typing state is kept separate from our own draft state
    // so the indicator only ever reflects the other person.
    set((state) => ({
      peerTypingByChat: {
        ...state.peerTypingByChat,
        [chat!.id]: opened.state === "typing",
      },
    }));
  },

  ensurePrivateNotes: async () => {
    const { vaultKey } = getVaultMaterial();
    const existing = get().chats.find((chat) => chat.id === PRIVATE_NOTES_CHAT_ID);
    if (existing) return existing;
    const chat: ChatSummary = {
      id: PRIVATE_NOTES_CHAT_ID,
      recipientPubKey: "",
      alias: "Private Notes",
      unreadCount: 0,
      updatedAt: Date.now(),
      kind: "notes",
      pinned: true,
    };
    await saveEncryptedChat(chat, vaultKey);
    set((state) => ({ chats: replaceChat(state.chats, chat) }));
    return chat;
  },

  updateChat: async (chatId, patch) => {
    const { vaultKey } = getVaultMaterial();
    const chat = get().chats.find((entry) => entry.id === chatId);
    if (!chat) return null;
    const updated: ChatSummary = { ...chat, ...patch, id: chat.id };
    await saveEncryptedChat(updated, vaultKey);
    set((state) => ({ chats: replaceChat(state.chats, updated) }));
    return updated;
  },

  clearChatMessages: async (chatId) => {
    const { vaultKey } = getVaultMaterial();
    const chat = get().chats.find((entry) => entry.id === chatId);
    const records = await database.messages.where("chatId").equals(chatId).toArray();
    for (const record of records) {
      await database.messages.delete(record.id);
      await database.notes.delete(record.id);
      await database.outbox.delete(record.id);
      const timer = ephemeralExpiryTimers.get(record.id);
      if (timer) {
        clearTimeout(timer);
        ephemeralExpiryTimers.delete(record.id);
      }
    }
    if (chat) {
      const updated = { ...chat, unreadCount: 0, updatedAt: Date.now() };
      await saveEncryptedChat(updated, vaultKey);
      set((state) => ({
        chats: replaceChat(state.chats, updated),
        messagesMap: { ...state.messagesMap, [chatId]: [] },
      }));
      return;
    }
    set((state) => ({
      messagesMap: { ...state.messagesMap, [chatId]: [] },
    }));
  },

  updateMessage: async (messageId, patch) => {
    const { vaultKey } = getVaultMaterial();
    let target: ChatMessage | undefined;
    let targetChatId: string | undefined;
    for (const [chatId, list] of Object.entries(get().messagesMap)) {
      const found = list.find((message) => message.id === messageId);
      if (found) {
        target = found;
        targetChatId = chatId;
        break;
      }
    }
    if (!target || !targetChatId) return;
    const updated: ChatMessage = { ...target, ...patch, id: target.id };
    await saveEncryptedMessage(updated, vaultKey);
    set((state) => ({
      messagesMap: {
        ...state.messagesMap,
        [targetChatId as string]: state.messagesMap[targetChatId as string].map(
          (message) => (message.id === messageId ? updated : message),
        ),
      },
    }));
  },

  deleteMessages: async (messageIds) => {
    const { vaultKey } = getVaultMaterial();
    if (messageIds.length === 0) return;
    const idSet = new Set(messageIds);
    for (const messageId of idSet) {
      await database.messages.delete(messageId);
      await database.notes.delete(messageId);
      await database.outbox.delete(messageId);
      const timer = ephemeralExpiryTimers.get(messageId);
      if (timer) {
        clearTimeout(timer);
        ephemeralExpiryTimers.delete(messageId);
      }
    }
    void vaultKey;
    set((state) => {
      const messagesMap: Record<string, ChatMessage[]> = {};
      for (const [chatId, list] of Object.entries(state.messagesMap)) {
        messagesMap[chatId] = list.filter((message) => !idSet.has(message.id));
      }
      return { messagesMap };
    });
  },

  deleteChat: async (chatId) => {
    const records = await database.messages.where("chatId").equals(chatId).toArray();
    for (const record of records) {
      await database.messages.delete(record.id);
      await database.notes.delete(record.id);
      await database.outbox.delete(record.id);
      const timer = ephemeralExpiryTimers.get(record.id);
      if (timer) {
        clearTimeout(timer);
        ephemeralExpiryTimers.delete(record.id);
      }
    }
    await database.chats.delete(chatId);
    await database.sessions.delete(`contact:${chatId}`);
    set((state) => ({
      chats: state.chats.filter((entry) => entry.id !== chatId),
      messagesMap: { ...state.messagesMap, [chatId]: [] },
      activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
    }));
  },

  loadChats: async () => {
    const { vaultKey } = getVaultMaterial();
    const records: EncryptedChatRecord[] = await database.chats.toArray();
    const chats: ChatSummary[] = [];
    for (const record of records) {
      const chat = await decryptRecord<ChatSummary>(
        record.ciphertext,
        record.nonce,
        vaultKey,
        isChatSummary,
      );
      chats.push(chat);
    }
    const messagesRecords = await database.messages.toArray();
    const messagesMap: Record<string, ChatMessage[]> = {};
    for (const chat of chats) {
      messagesMap[chat.id] = await loadMessages(
        chat.id,
        messagesRecords,
        vaultKey,
      );
    }
    const now = Date.now();
    const expiredIds = new Set(
      getExpiredMessageIds(Object.values(messagesMap).flat(), now),
    );
    for (const chatMessages of Object.values(messagesMap)) {
      for (const message of chatMessages) {
        if (expiredIds.has(message.id)) {
          await database.messages.delete(message.id);
          await database.notes.delete(message.id);
          await database.outbox.delete(message.id);
          messagesMap[message.chatId] = messagesMap[message.chatId].filter(
            (existing) => existing.id !== message.id,
          );
        } else {
          scheduleMessageExpiry(message);
        }
      }
    }
    // The Private Notes thread is a first-class encrypted chat row; make sure
    // it always exists so the sidebar shows it and notes never fail to save.
    if (!chats.some((chat) => chat.id === PRIVATE_NOTES_CHAT_ID)) {
      const notesChat: ChatSummary = {
        id: PRIVATE_NOTES_CHAT_ID,
        recipientPubKey: "",
        alias: "Private Notes",
        unreadCount: 0,
        updatedAt: now,
        kind: "notes",
        pinned: true,
      };
      await saveEncryptedChat(notesChat, vaultKey);
      chats.push(notesChat);
      messagesMap[PRIVATE_NOTES_CHAT_ID] = [];
    }
    set({
      chats: sortChats(chats),
      messagesMap,
    });
  },

  updateDeliveryStatus: async (messageId, status) => {
    const { vaultKey } = getVaultMaterial();
    const chatId = Object.keys(get().messagesMap).find((key) =>
      get().messagesMap[key].some((message) => message.id === messageId),
    );
    if (!chatId) return;
    const current = get().messagesMap[chatId].find(
      (message) => message.id === messageId,
    );
    if (!current || messageStatusRank[status] <= messageStatusRank[current.status]) {
      return;
    }
    const updated = { ...current, status };
    await saveEncryptedMessage(updated, vaultKey);
    set((state) => ({
      messagesMap: {
        ...state.messagesMap,
        [chatId]: state.messagesMap[chatId].map((message) =>
          message.id === messageId ? updated : message,
        ),
      },
    }));
  },
}));

registerMemoryKeyCleanup(() => {
  transportManager.stop();
  for (const timer of ephemeralExpiryTimers.values()) clearTimeout(timer);
  ephemeralExpiryTimers.clear();
  useChatStore.setState({
    activeChatId: null,
    chats: [],
    messagesMap: {},
    isRelayConnected: false,
    relayStatus: "disconnected",
    transportError: null,
    typingByChat: {},
    peerTypingByChat: {},
    typingSentAt: {},
  });
});

export function startChatServices(): () => void {
  const { identity, vaultKey, isUnlocked } = useVaultStore.getState();
  if (!isUnlocked || !identity || !vaultKey) {
    throw new Error("Unlock the vault before starting relay transport.");
  }
  transportManager.start(vaultKey, encodeBytes(identity.encryptionPublicKey), {
    onMessage: (packet) => useChatStore.getState().receiveMessage(packet),
    onTyping: (signal) => useChatStore.getState().receiveTyping(signal),
    onReceipt: (messageId, status) =>
      void useChatStore.getState().updateDeliveryStatus(messageId, status),
    onSent: (messageId) =>
      void useChatStore.getState().updateDeliveryStatus(messageId, "sent"),
    onConnectionChange: (relayStatus) =>
      useChatStore.getState().setRelayStatus(relayStatus),
    onError: (error) =>
      useChatStore.setState({ transportError: error.message }),
  });
  return () => transportManager.stop();
}
