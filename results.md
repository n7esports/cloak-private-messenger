# Zustand / Transport / Relay Status Investigation

## 1. The Zustand store files

### `client/store/useVaultStore.ts` (full)

```ts
"use client";

import { create } from "zustand";
import { initCrypto, type IdentityKeys } from "../lib/crypto";
import {
  decryptIdentityWithVaultKey,
  database,
  getOrCreateLocalVaultKey,
  readLocalVaultKey,
  saveIdentityWithVaultKey,
  VaultCorruptionError,
  VaultStoragePermissionError,
  type VaultRecord,
} from "../lib/vault";

const LOCK_FLAG = "cloak.locked";

interface VaultState {
  isUnlocked: boolean;
  sessionRestored: boolean;
  sessionRestoreError: string | null;
  vaultKey: Uint8Array | null;
  identity: IdentityKeys | null;
  initializeVault: () => Promise<void>;
  unlockVault: () => Promise<void>;
  lockVault: () => void;
  clearMemoryKeys: () => void;
}

let unlockGeneration = 0;
let initialization: Promise<void> | undefined;
const memoryKeyCleanups = new Set<() => void>();

function isStoragePermissionFailure(error: unknown): boolean {
  return (
    error instanceof Error &&
    ["InvalidStateError", "NotAllowedError", "SecurityError", "QuotaExceededError"].includes(
      error.name,
    )
  );
}

function normalizeVaultOpenError(error: unknown): unknown {
  if (
    error instanceof VaultStoragePermissionError ||
    error instanceof VaultCorruptionError
  ) {
    return error;
  }
  if (isStoragePermissionFailure(error)) {
    return new VaultStoragePermissionError(
      "Browser storage is unavailable or blocked. Check your browser privacy settings and try again.",
    );
  }
  return error;
}

function isLockFlagged(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(LOCK_FLAG) === "1";
  } catch {
    return false;
  }
}

function setLockFlag(locked: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (locked) window.sessionStorage.setItem(LOCK_FLAG, "1");
    else window.sessionStorage.removeItem(LOCK_FLAG);
  } catch {
    // The in-memory lock state still applies for the current page.
  }
}

function clearKeys(state: Pick<VaultState, "vaultKey" | "identity">): void {
  state.vaultKey?.fill(0);
  state.identity?.signingPrivateKey.fill(0);
  state.identity?.encryptionPrivateKey.fill(0);
  state.identity?.signingPublicKey.fill(0);
  state.identity?.encryptionPublicKey.fill(0);
  for (const cleanup of memoryKeyCleanups) cleanup();
}

export function registerMemoryKeyCleanup(cleanup: () => void): () => void {
  memoryKeyCleanups.add(cleanup);
  return () => memoryKeyCleanups.delete(cleanup);
}

async function createIdentityWithVaultKey(vaultKey: Uint8Array): Promise<IdentityKeys> {
  const sodium = await initCrypto();
  const signing = sodium.crypto_sign_keypair();
  const encryption = sodium.crypto_box_keypair();
  const identity: IdentityKeys = {
    signingPublicKey: signing.publicKey,
    signingPrivateKey: signing.privateKey,
    encryptionPublicKey: encryption.publicKey,
    encryptionPrivateKey: encryption.privateKey,
  };
  await saveIdentityWithVaultKey(identity, vaultKey);
  return identity;
}

async function unlockFromLocalKey(): Promise<void> {
  const request = ++unlockGeneration;
  let vaultKey: Uint8Array | undefined;
  let identity: IdentityKeys | undefined;
  try {
    vaultKey = await getOrCreateLocalVaultKey();
    const record: VaultRecord | undefined = await database.vault.get("primary");
    if (record) {
      try {
        identity = await decryptIdentityWithVaultKey(record, vaultKey);
      } catch (error) {
        if (
          error instanceof VaultStoragePermissionError ||
          error instanceof VaultCorruptionError ||
          isStoragePermissionFailure(error)
        ) {
          throw error;
        }
        throw new VaultCorruptionError(
          "The encrypted device identity could not be opened. Your vault may be corrupted or its browser key storage may have changed.",
        );
      }
    } else {
      identity = await createIdentityWithVaultKey(vaultKey);
    }

    if (request !== unlockGeneration) {
      vaultKey.fill(0);
      identity.signingPrivateKey.fill(0);
      identity.encryptionPrivateKey.fill(0);
      identity.signingPublicKey.fill(0);
      identity.encryptionPublicKey.fill(0);
      return;
    }

    useVaultStore.setState({
      isUnlocked: true,
      sessionRestored: true,
      sessionRestoreError: null,
      vaultKey,
      identity,
    });
  } catch (error) {
    const reportedError = normalizeVaultOpenError(error);
    vaultKey?.fill(0);
    identity?.signingPrivateKey.fill(0);
    identity?.encryptionPrivateKey.fill(0);
    identity?.signingPublicKey.fill(0);
    identity?.encryptionPublicKey.fill(0);
    if (request !== unlockGeneration) return;
    const errorMessage =
      reportedError instanceof Error
        ? reportedError.message
        : "Could not open the device vault.";
    useVaultStore.setState({
      sessionRestored: true,
      sessionRestoreError: errorMessage,
      isUnlocked: false,
      vaultKey: null,
      identity: null,
    });
    throw reportedError;
  }
}

export const useVaultStore = create<VaultState>((set, get) => ({
  isUnlocked: false,
  sessionRestored: false,
  sessionRestoreError: null,
  vaultKey: null,
  identity: null,
  initializeVault: async () => {
    if (
      (get().sessionRestored && !get().sessionRestoreError) ||
      typeof window === "undefined"
    ) return;
    if (get().sessionRestoreError) {
      set({ sessionRestored: false, sessionRestoreError: null });
    }
    if (isLockFlagged()) {
      set({
        isUnlocked: false,
        sessionRestored: true,
        sessionRestoreError: null,
        vaultKey: null,
        identity: null,
      });
      return;
    }
    initialization ??= unlockFromLocalKey().finally(() => {
      initialization = undefined;
    });
    await initialization;
  },
  unlockVault: async () => {
    setLockFlag(false);
    await unlockFromLocalKey();
  },
  lockVault: () => {
    unlockGeneration += 1;
    initialization = undefined;
    setLockFlag(true);
    clearKeys(get());
    set({
      isUnlocked: false,
      sessionRestored: true,
      sessionRestoreError: null,
      vaultKey: null,
      identity: null,
    });
  },
  clearMemoryKeys: () => {
    unlockGeneration += 1;
    clearKeys(get());
    set({
      isUnlocked: false,
      sessionRestored: true,
      sessionRestoreError: null,
      vaultKey: null,
      identity: null,
    });
  },
}));

export { readLocalVaultKey as readVaultKey };
```

### `client/store/useChatStore.ts` (full)

```ts
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
  deriveAndSkipReceiveKey,
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
import type { Channel, DeviceSession, ToastNotification } from "../types";

export const PRIVATE_NOTES_CHAT_ID = "private-notes";
export const WELCOME_CHAT_ID = "welcome-guide";

export type MessageStatus = "queued" | "sent" | "delivered" | "read";
export type ChatKind = "direct" | "system" | "notes";

export interface ChatSummary {
  id: string;
  recipientPubKey: string;
  peerSigningPubKey?: string;
  alias: string;
  unreadCount: number;
  updatedAt: number;
  kind: ChatKind;
  pinned: boolean;
  favorite?: boolean;
  mutedUntil?: number;
  mutedForever?: boolean;
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
  readAt?: number;
  outgoing: boolean;
  ephemeralTimer?: number;
  attachment?: MessageAttachment;
  starred?: boolean;
  pinned?: boolean;
  reactions?: string[];
  replyTo?: MessageReplyRef;
}

export interface PendingRequest {
  senderEncryptionPubKey: string;
  senderPubKey: string;
  packet: SignedEnvelope;
  receivedAt: number;
}

export interface ChatState {
  activeChatId: string | null;
  chats: ChatSummary[];
  messagesMap: Record<string, ChatMessage[]>;
  pendingRequests: PendingRequest[];
  isRelayConnected: boolean;
  relayStatus: RelayStatus;
  transportError: string | null;
  typingByChat: Record<string, boolean>;
  peerTypingByChat: Record<string, boolean>;
  peerTypingAtByChat: Record<string, number>;
  typingSentAt: Record<string, number>;
  isLoading: boolean;
  error: string | null;
  channels: Channel[];
  devices: DeviceSession[];
  ephemeralTtl: number | null;
  toasts: ToastNotification[];
  globalSearch: string;
  vaultModalOpen: boolean;
  securityModalOpen: boolean;
  callModalState: "closed" | "outgoing" | "incoming" | "active";
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setEphemeralTtl: (ttl: number | null) => void;
  setGlobalSearch: (search: string) => void;
  setVaultModalOpen: (open: boolean) => void;
  setSecurityModalOpen: (open: boolean) => void;
  setCallModalState: (state: "closed" | "outgoing" | "incoming" | "active") => void;
  addChannel: (channel: Channel) => void;
  removeDevice: (deviceId: string) => void;
  panicShred: () => void;
  showToast: (toast: ToastNotification) => void;
  dismissToast: (toastId: string) => void;
  acceptPendingRequest: (senderKey: string) => Promise<void>;
  dismissPendingRequest: (senderKey: string) => void;
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
    signerEncryptionPubKey?: string,
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

const chatLocks = new Map<string, Promise<unknown>>();

async function withChatLock<T>(chatId: string, fn: () => Promise<T>): Promise<T> {
  const previous = chatLocks.get(chatId) ?? Promise.resolve();
  const next = previous.then(fn, () => fn());
  chatLocks.set(chatId, next);
  try {
    return (await next) as Promise<T>;
  } finally {
    if (chatLocks.get(chatId) === next) {
      chatLocks.delete(chatId);
    }
  }
}

const MAX_RECENTLY_SEEN_MESSAGE_IDS = 5_000;
const recentlySeenMessageIds = new Set<string>();

function markMessageSeen(id: string): boolean {
  if (recentlySeenMessageIds.has(id)) return false;
  recentlySeenMessageIds.add(id);
  if (recentlySeenMessageIds.size > MAX_RECENTLY_SEEN_MESSAGE_IDS) {
    const oldest = recentlySeenMessageIds.values().next().value;
    if (oldest !== undefined) recentlySeenMessageIds.delete(oldest);
  }
  return true;
}

function notifyIncoming(chat: { alias: string; mutedUntil?: number; mutedForever?: boolean }): void {
  if (chat.mutedForever) return;
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
    (!("peerSigningPubKey" in value) ||
      value.peerSigningPubKey === undefined ||
      typeof value.peerSigningPubKey === "string") &&
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
    (!("mutedForever" in value) ||
      value.mutedForever === undefined ||
      typeof value.mutedForever === "boolean") &&
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
    ...(message.reactions === undefined
      ? {}
      : { reactions: message.reactions }),
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
    typeof value === "object" ||
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
    skippedKeys: parseSkippedKeys(
      "skippedKeys" in value ? value.skippedKeys : undefined,
    ),
  };
}

function parseSkippedKeys(value: unknown): Map<number, Uint8Array> | undefined {
  if (!Array.isArray(value)) return undefined;
  const map = new Map<number, Uint8Array>();
  for (const entry of value) {
    if (
      !Array.isArray(entry) ||
      entry.length !== 2 ||
      typeof entry[0] !== "number" ||
      !Array.isArray(entry[1]) ||
      entry[1].length !== 32
    ) {
      return undefined;
    }
    map.set(entry[0], Uint8Array.from(entry[1] as number[]));
  }
  return map;
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
    skippedKeys: session.skippedKeys
      ? [...session.skippedKeys.entries()].map(([counter, key]) => [
          counter,
          Array.from(key),
        ])
      : [],
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
      ...(payload.reactions === undefined
        ? {}
        : { reactions: payload.reactions }),
      ...(payload.replyTo === undefined ? {} : { replyTo: payload.replyTo }),
    });
  }
  return messages.sort((left, right) => left.timestamp - right.timestamp);
}

async function expireMessage(messageId: string): Promise<void> {
  try {
    await database.messages.delete(messageId);
    await database.notes.delete(messageId);
    await database.outbox.delete(messageId);
    ephemeralExpiryTimers.delete(messageId);
    useChatStore.setState((state) => {
      const messagesMap: Record<string, ChatMessage[]> = {};
      for (const [chatId, list] of Object.entries(state.messagesMap)) {
        messagesMap[chatId] = list.filter((message) => message.id !== messageId);
      }
      return { messagesMap };
    });
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
  pendingRequests: [],
  isRelayConnected: false,
  relayStatus: "disconnected",
  transportError: null,
  typingByChat: {},
  peerTypingByChat: {},
  peerTypingAtByChat: {},
  typingSentAt: {},
  isLoading: false,
  error: null,
  channels: [],
  devices: [],
  ephemeralTtl: null,
  toasts: [],
  globalSearch: "",
  vaultModalOpen: false,
  securityModalOpen: false,
  callModalState: "closed",
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setEphemeralTtl: (ttl) => set({ ephemeralTtl: ttl }),
  setGlobalSearch: (search) => set({ globalSearch: search }),
  setVaultModalOpen: (open) => set({ vaultModalOpen: open }),
  setSecurityModalOpen: (open) => set({ securityModalOpen: open }),
  setCallModalState: (state) => set({ callModalState: state }),

  addChannel: (channel) =>
    set((state) => ({
      channels: [...state.channels.filter((c) => c.id !== channel.id), channel],
    })),

  removeDevice: (deviceId) =>
    set((state) => ({
      devices: state.devices.filter((d) => d.id !== deviceId),
    })),

  panicShred: () => {
    set({
      activeChatId: null,
      chats: [],
      messagesMap: {},
      pendingRequests: [],
      channels: [],
      devices: [],
      ephemeralTtl: null,
      toasts: [],
      globalSearch: "",
      vaultModalOpen: false,
      securityModalOpen: false,
      callModalState: "closed",
      sidebarOpen: false,
      typingByChat: {},
      peerTypingByChat: {},
      peerTypingAtByChat: {},
      typingSentAt: {},
      transportError: null,
    });
    void (async () => {
      try {
        await database.chats.clear();
        await database.messages.clear();
        await database.sessions.clear();
        await database.notes.clear();
        await database.outbox.clear();
      } catch {
        // Best-effort cleanup
      }
    })();
  },

  showToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts.filter((t) => t.id !== toast.id), toast],
    })),

  dismissToast: (toastId) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== toastId),
    })),

  acceptPendingRequest: async (senderKey) => {
    const request = get().pendingRequests.find(
      (entry) => entry.senderEncryptionPubKey === senderKey,
    );
    if (!request) return;
    set((state) => ({
      pendingRequests: state.pendingRequests.filter(
        (entry) => entry.senderEncryptionPubKey !== senderKey,
      ),
    }));
    await get().addContact("Unnamed Contact", senderKey);
    await get().receiveMessage(request.packet);
  },

  dismissPendingRequest: (senderKey) => {
    set((state) => ({
      pendingRequests: state.pendingRequests.filter(
        (entry) => entry.senderEncryptionPubKey !== senderKey,
      ),
    }));
  },

  setRelayStatus: (relayStatus) => {
    const current = get();
    if (current.relayStatus === relayStatus && current.isRelayConnected === (relayStatus === "connected")) return;
    set({
      relayStatus,
      isRelayConnected: relayStatus === "connected",
      ...(relayStatus === "connected" ? { transportError: null } : {}),
    });
  },

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
    const normalizedKey = recipientPubKey.trim().replace(/^cloak:/i, "");
    const publicKey = /^[0-9a-f]{64}$/i.test(normalizedKey)
      ? Uint8Array.from(
          normalizedKey.match(/.{2}/g) ?? [],
          (byte) => Number.parseInt(byte, 16),
        )
      : decodeBytes(normalizedKey);
    if (publicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
      throw new Error("Contact encryption public key has an invalid length.");
    }
    if (sodium.memcmp(publicKey, identity.encryptionPublicKey)) {
      throw new Error("You cannot add your own identity as a contact.");
    }
    const id = sodium.to_hex(sodium.crypto_generichash(16, publicKey, null));
    const existing = get().chats.find((chat) => chat.id === id);
    if (existing) {
      if (existing.recipientPubKey !== encodeBytes(publicKey)) {
        throw new Error(
          "This contact's encryption key has changed. Remove the old conversation and re-add them with the new key.",
        );
      }
      return existing;
    }
    const chat: ChatSummary = {
      id,
      recipientPubKey: encodeBytes(publicKey),
      alias: alias.trim() || "Unnamed Contact",
      unreadCount: 0,
      updatedAt: Date.now(),
      kind: "direct",
      pinned: false,
    };
    await saveEncryptedChat(chat, vaultKey);
    set((state) => ({ chats: replaceChat(state.chats, chat) }));
    return chat;
  },

  sendMessage: async (...args) => {
    const content = args[0];
    const type = args[1] ?? "text";
    const ephemeralTimer = args[2];
    const attachment = args[3];
    const replyTo = args[4];
    const chatId = get().activeChatId;
    if (!chatId) throw new Error("Select a conversation before sending a message.");
    return withChatLock(chatId, async () => {
      const { identity, vaultKey } = getVaultMaterial();
      const chat = get().chats.find((entry) => entry.id === chatId);
      if (!chat) throw new Error("The active conversation could not be found.");
      if (chat.kind === "system") {
        throw new Error("The Welcome Guide is a read-only system conversation.");
      }
      if (!content.trim() && !attachment) {
        throw new Error("A message cannot be empty.");
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
            rotated.session.sendCounter - 1,
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
    });
  },

  receiveMessage: async (packet) => {
    const senderEncryptionKey = decodeBytes(packet.senderEncryptionPubKey);
    const senderKey = encodeBytes(senderEncryptionKey);
    return withChatLock(senderKey, async () => {
      const { identity, vaultKey } = getVaultMaterial();
      if (!(await verifySignedEnvelope(packet))) {
        throw new Error("Incoming message signature is invalid.");
      }
      if (!markMessageSeen(packet.id)) {
        try {
          await transportManager.publishReceipt(
            packet.id,
            "delivered",
            senderKey,
            identity,
          );
        } catch {
          // Acknowledgement is best-effort for already-seen messages.
        }
        return;
      }
      const MAX_SKEW_MS = 24 * 60 * 60 * 1000;
      const now = Date.now();
      if (
        !Number.isSafeInteger(packet.envelope.timestamp) ||
        packet.envelope.timestamp < now - MAX_SKEW_MS ||
        packet.envelope.timestamp > now + MAX_SKEW_MS
      ) {
        return;
      }
      const alreadyPersisted = await database.messages.get(packet.id);
      if (alreadyPersisted) {
        await transportManager.publishReceipt(packet.id, "delivered", senderKey, identity);
        return;
      }
      const blockedChat = get().chats.find(
        (entry) => entry.kind === "direct" && entry.recipientPubKey === senderKey,
      );
      if (blockedChat?.blocked) {
        try {
          await transportManager.publishReceipt(packet.id, "delivered", senderKey, identity);
        } catch {
          // Acknowledgement is best-effort for dropped messages.
        }
        return;
      }
      let chat = get().chats.find(
        (entry) =>
          entry.kind === "direct" && entry.recipientPubKey === senderKey,
      );
      if (!chat) {
        if (
          !get().pendingRequests.some(
            (request) => request.senderEncryptionPubKey === senderKey,
          )
        ) {
          set((state) => ({
            pendingRequests: [
              ...state.pendingRequests,
              {
                senderEncryptionPubKey: senderKey,
                senderPubKey: packet.senderPubKey,
                packet,
                receivedAt: Date.now(),
              },
            ],
          }));
        }
        return;
      }
      if (chat.peerSigningPubKey && chat.peerSigningPubKey !== packet.senderPubKey) {
        return;
      }
      let session = await getRatchetSession(
        chat.id,
        identity,
        senderEncryptionKey,
        vaultKey,
      );
      const skipped = new Map(session.skippedKeys ?? []);
      let messageKey: Uint8Array;
      let advancedSession: RatchetSession;
      try {
        const result = await deriveAndSkipReceiveKey(
          session,
          packet.envelope.counter,
          skipped,
        );
        messageKey = result.messageKey;
        advancedSession = result.session;
      } catch {
        return;
      }
      let payload: InnerPayload;
      try {
        payload = await openEnvelope(
          packet.envelope,
          identity,
          messageKey,
        );
      } finally {
        messageKey.fill(0);
      }
      session = advancedSession;
      await saveRatchetSession(chat.id, session, vaultKey);
      session.receiveChainKey.fill(0);
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
        peerSigningPubKey: chat.peerSigningPubKey ?? packet.senderPubKey,
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
        await transportManager.publishReceipt(packet.id, "delivered", senderKey, identity);
        if (isActive) {
          await transportManager.publishReceipt(packet.id, "read", senderKey, identity);
        }
      } catch (error) {
        set({
          transportError:
            error instanceof Error ? error.message : "Could not acknowledge incoming message.",
        });
      }
    });
  },

  markAsRead: async (chatId) => {
    const { identity, vaultKey } = getVaultMaterial();
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
            identity,
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
    if (now - lastSent < TYPING_THROTTLE_MS) return;
    set((state) => ({
      typingSentAt: { ...state.typingSentAt, [chatId]: now },
    }));
    void buildTypingSignal(
      isTyping ? "typing" : "stop",
      identity,
      decodeBytes(chat.recipientPubKey),
    )
      .then((signal) => transportManager.sendTyping(signal))
      .catch(() => {});
  },

  receiveTyping: async (signal) => {
    const { identity, vaultKey } = useVaultStore.getState();
    if (!identity || !vaultKey) return;
    const opened = await openTypingSignal(signal, identity);
    const senderKey = opened.senderEncryptionPubKey;
    const chat = get().chats.find(
      (entry) => entry.kind === "direct" && entry.recipientPubKey === senderKey,
    );
    if (!chat) return;
    if (chat.peerSigningPubKey && chat.peerSigningPubKey !== signal.senderPubKey) {
      return;
    }
    set((state) => ({
      peerTypingByChat: {
        ...state.peerTypingByChat,
        [chat.id]: opened.state === "typing",
      },
      peerTypingAtByChat: {
        ...state.peerTypingAtByChat,
        [chat.id]: Date.now(),
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
    set({ isLoading: true, error: null });
    try {
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
        error: null,
      });
    } catch (cause: unknown) {
      set({
        error:
          cause instanceof Error
            ? cause.message
            : "Could not load encrypted conversations.",
      });
      throw cause;
    } finally {
      set({ isLoading: false });
    }
  },

  updateDeliveryStatus: async (messageId, status, signerEncryptionPubKey) => {
    const { vaultKey } = getVaultMaterial();
    const chatId = Object.keys(get().messagesMap).find((key) =>
      get().messagesMap[key].some((message) => message.id === messageId),
    );
    if (!chatId) {
      const record = await database.messages.get(messageId);
      if (!record) return;
      const chat = get().chats.find((entry) => entry.id === record.chatId);
      if (
        signerEncryptionPubKey !== undefined &&
        chat &&
        chat.kind === "direct" &&
        chat.recipientPubKey !== signerEncryptionPubKey
      ) {
        return;
      }
      const payload = await decryptRecord<StoredMessage>(
        record.ciphertext,
        record.nonce,
        vaultKey,
        isStoredMessage,
      );
      if (messageStatusRank[status] <= messageStatusRank[payload.status]) return;
      await saveEncryptedMessage(
        {
          id: messageId,
          chatId: record.chatId,
          senderPubKey: payload.senderPubKey,
          content: payload.content,
          type: payload.type,
          status,
          timestamp: record.createdAt,
          outgoing: payload.outgoing,
          ...(payload.ephemeralTimer === undefined
            ? {}
            : { ephemeralTimer: payload.ephemeralTimer }),
          ...(payload.starred === undefined ? {} : { starred: payload.starred }),
          ...(payload.pinned === undefined ? {} : { pinned: payload.pinned }),
          ...(payload.reactions === undefined
            ? {}
            : { reactions: payload.reactions }),
          ...(payload.replyTo === undefined ? {} : { replyTo: payload.replyTo }),
        },
        vaultKey,
      );
      return;
    }
    const chat = get().chats.find((entry) => entry.id === chatId);
    if (
      signerEncryptionPubKey !== undefined &&
      chat &&
      chat.kind === "direct" &&
      chat.recipientPubKey !== signerEncryptionPubKey
    ) {
      return;
    }
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
    pendingRequests: [],
    isRelayConnected: false,
    relayStatus: "disconnected",
    transportError: null,
    typingByChat: {},
    peerTypingByChat: {},
    peerTypingAtByChat: {},
    typingSentAt: {},
    isLoading: false,
    error: null,
    channels: [],
    devices: [],
    ephemeralTtl: null,
    toasts: [],
    globalSearch: "",
    vaultModalOpen: false,
    securityModalOpen: false,
    callModalState: "closed",
    sidebarOpen: false,
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
    onReceipt: (messageId, status, signerEncryptionPubKey) =>
      void useChatStore
        .getState()
        .updateDeliveryStatus(messageId, status, signerEncryptionPubKey),
    onSent: (messageId) =>
      void useChatStore.getState().updateDeliveryStatus(messageId, "sent"),
    onConnectionChange: (relayStatus) =>
      useChatStore.getState().setRelayStatus(relayStatus),
    onError: (error) =>
      useChatStore.setState({ transportError: error.message }),
  });
  return () => transportManager.stop();
}
```

---

## 2. Every place that calls a Zustand setter

### Connection-related writes

**`client/lib/transport.ts:329`** — `setConnectionStatus` definition
```ts
327|  private lastConnectionStatus: RelayStatus | null = null;
328|
329|  private setConnectionStatus(status: RelayStatus): void {
330|    if (this.lastConnectionStatus === status) return;
331|    this.lastConnectionStatus = status;
332|    this.callbacks?.onConnectionChange(status);
333|  }
```

**`client/lib/transport.ts:197`**
```ts
192|  private messageProcessing: Promise<void> = Promise.resolve();
193|
194|  private readonly onOffline = (): void => {
195|    this.connectPromise = null;
196|    this.setConnectionStatus("disconnected");
197|    this.removeChannels();
198|  };
```

**`client/lib/transport.ts:230`**
```ts
225|    this.stopped = true;
226|    this.connectPromise = null;
227|    this.vaultKey?.fill(0);
228|    this.vaultKey = null;
229|    this.recipientPubKey = null;
230|    this.setConnectionStatus("disconnected");
231|    if (typeof window !== "undefined") {
232|      window.removeEventListener("online", this.onOnline);
```

**`client/lib/transport.ts:345`**
```ts
342|  private connect(): Promise<void> {
343|    if (this.stopped || !this.recipientPubKey) return Promise.resolve();
344|    if (typeof navigator !== "undefined" && !navigator.onLine) {
345|      this.setConnectionStatus("disconnected");
346|      return Promise.resolve();
347|    }
348|    if (this.inboxChannel) return Promise.resolve();
349|    if (this.connectPromise) return this.connectPromise;
350|    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
351|      return Promise.resolve();
352|    }
353|
354|    this.setConnectionStatus("connecting");
```

**`client/lib/transport.ts:362`**
```ts
356|    trackedAttempt = this.openInboxChannel()
357|      .catch((error: unknown) => {
358|        const cause =
359|          error instanceof Error
360|            ? error
361|            : new Error("Could not subscribe to the Supabase inbox channel.");
362|        this.setConnectionStatus("disconnected");
363|        this.callbacks?.onError(cause);
364|        this.scheduleReconnect();
365|      })
```

**`client/lib/transport.ts:458`**
```ts
453|      channel.subscribe((status: string, error?: Error) => {
454|        if (!isBroadcastStatus(status)) return;
455|        if (status === "SUBSCRIBED") {
456|          if (this.stopped || this.inboxChannel !== channel) return;
457|          this.reconnectAttempt = 0;
458|          this.setConnectionStatus("connected");
459|          if (!settled) {
460|            settled = true;
461|            clearTimeout(timeout);
462|            resolve();
463|          }
```

**`client/lib/transport.ts:474`**
```ts
469|        // callback to prevent rapid state oscillations that trigger React Error #185.
470|        if (this.inboxChannel !== channel || this.stopped) return;
471|        const cause =
472|          error ??
473|          new Error(`Supabase broadcast channel status: ${status}.`);
474|        this.setConnectionStatus("disconnected");
475|        if (!settled) {
476|          settled = true;
477|          clearTimeout(timeout);
478|          reject(cause);
479|        } else if (status !== "CLOSED") {
```

**`client/lib/transport.ts:602`**
```ts
600|  private handleConnectionFailure(error: Error): void {
601|    this.callbacks?.onError(error);
602|    this.setConnectionStatus("disconnected");
603|    this.removeChannels();
604|    this.scheduleReconnect();
605|  }
```

### Zustand setter calls outside the store files

**`client/store/useChatStore.ts:637`** — `useChatStore.setState` in `expireMessage`
```ts
632|      ephemeralExpiryTimers.delete(messageId);
633|      // Reconcile in-memory state across EVERY chat, not just the one that
634|      // happened to be found first: a message whose owning chat is not loaded
635|      // must not linger in messagesMap and render as a ghost.
636|      useChatStore.setState((state) => {
637|        const messagesMap: Record<string, ChatMessage[]> = {};
638|        for (const [chatId, list] of Object.entries(state.messagesMap)) {
639|          messagesMap[chatId] = list.filter((message) => message.id !== messageId);
640|        }
641|        return { messagesMap };
642|      });
```

**`client/store/useChatStore.ts:645`** — `useChatStore.setState` in `expireMessage` catch
```ts
640|        return { messagesMap };
641|      });
642|    } catch (error) {
643|      useChatStore.setState({
644|        transportError:
645|          error instanceof Error
646|            ? `Could not expire message: ${error.message}`
647|            : "Could not expire message.",
648|      });
649|    }
650|  }
```

**`client/store/useChatStore.ts:1541`** — `useChatStore.setState` in `registerMemoryKeyCleanup`
```ts
1536|registerMemoryKeyCleanup(() => {
1537|  transportManager.stop();
1538|  for (const timer of ephemeralExpiryTimers.values()) clearTimeout(timer);
1539|  ephemeralExpiryTimers.clear();
1540|  useChatStore.setState({
1541|    activeChatId: null,
1542|    chats: [],
1543|    messagesMap: {},
1544|    pendingRequests: [],
1545|    isRelayConnected: false,
1546|    relayStatus: "disconnected",
1547|    transportError: null,
...
```

**`client/store/useChatStore.ts:1584`** — `useChatStore.setState` in `startChatServices` `onError`
```ts
1579|    onSent: (messageId) =>
1580|      void useChatStore.getState().updateDeliveryStatus(messageId, "sent"),
1581|    onConnectionChange: (relayStatus) =>
1582|      useChatStore.getState().setRelayStatus(relayStatus),
1583|    onError: (error) =>
1584|      useChatStore.setState({ transportError: error.message }),
1585|  });
1586|  return () => transportManager.stop();
```

**`client/store/useVaultStore.ts:146`** — `useVaultStore.setState` in `unlockFromLocalKey` success
```ts
141|      identity = await createIdentityWithVaultKey(vaultKey);
142|    }
143|
144|    if (request !== unlockGeneration) {
145|      vaultKey.fill(0);
146|      identity.signingPrivateKey.fill(0);
147|      identity.encryptionPrivateKey.fill(0);
148|      identity.signingPublicKey.fill(0);
149|      identity.encryptionPublicKey.fill(0);
150|      return;
151|    }
152|
153|    useVaultStore.setState({
154|      isUnlocked: true,
155|      sessionRestored: true,
156|      sessionRestoreError: null,
157|      vaultKey,
158|      identity,
159|    });
```

**`client/store/useVaultStore.ts:165`** — `useVaultStore.setState` in `unlockFromLocalKey` failure
```ts
160|    vaultKey?.fill(0);
161|    identity?.signingPrivateKey.fill(0);
162|    identity?.encryptionPrivateKey.fill(0);
163|    identity?.signingPublicKey.fill(0);
164|    identity?.encryptionPublicKey.fill(0);
165|    if (request !== unlockGeneration) return;
166|    const errorMessage =
167|      reportedError instanceof Error
168|        ? reportedError.message
169|        : "Could not open the device vault.";
170|    useVaultStore.setState({
171|      sessionRestored: true,
172|      sessionRestoreError: errorMessage,
173|      isUnlocked: false,
174|      vaultKey: null,
175|      identity: null,
176|    });
```

---

## 3. The Header component

`client/components/Header.tsx` (full):

```tsx
"use client";

import { useChatStore } from "../store/useChatStore";
import type { RelayStatus } from "../lib/transport";

const STATUS_META: Record<
  RelayStatus,
  { label: string; color: string }
> = {
  connected: { label: "Secure", color: "bg-emerald shadow-glow-sm" },
  connecting: { label: "Connecting", color: "bg-amber shadow-[0_0_10px_rgba(245,158,11,0.5)]" },
  disconnected: { label: "Offline", color: "bg-zinc-600" },
  error: { label: "Error", color: "bg-crimson shadow-[0_0_10px_rgba(220,38,38,0.4)]" },
};

export function Header({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const relayStatus = useChatStore((s) => s.relayStatus);
  const isRelayConnected = useChatStore((s) => s.isRelayConnected);
  const setSecurityModalOpen = useChatStore((s) => s.setSecurityModalOpen);
  const setCallModalState = useChatStore((s) => s.setCallModalState);

  const meta = STATUS_META[relayStatus] || STATUS_META.disconnected;

  return (
    <header className="flex items-center justify-between border-b border-zinc-800/60 bg-zinc-950/40 px-4 py-3 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden rounded-lg border border-zinc-800 px-2 py-1 text-xs text-zinc-300"
          >
            Menu
          </button>
        )}
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${meta.color}`}
          />
          <span className="text-xs uppercase tracking-widest text-zinc-400">
            {meta.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setSecurityModalOpen(true)}
          className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
        >
          Verify Safety Numbers
        </button>
        <button
          onClick={() => setCallModalState("outgoing")}
          className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
        >
          Call
        </button>
      </div>
    </header>
  );
}
```

It uses selector functions: `useChatStore((s) => s.relayStatus)` and `useChatStore((s) => s.isRelayConnected)`. Not the whole store.

---

## 4. Transport → store bridge

`TransportManager` does **not** call a Zustand setter directly. It calls a callback that was passed in at startup.

The bridge is built in `client/store/useChatStore.ts` inside `startChatServices()` (line 1567):

```ts
export function startChatServices(): () => void {
  const { identity, vaultKey, isUnlocked } = useVaultStore.getState();
  if (!isUnlocked || !identity || !vaultKey) {
    throw new Error("Unlock the vault before starting relay transport.");
  }
  transportManager.start(vaultKey, encodeBytes(identity.encryptionPublicKey), {
    onMessage: (packet) => useChatStore.getState().receiveMessage(packet),
    onTyping: (signal) => useChatStore.getState().receiveTyping(signal),
    onReceipt: (messageId, status, signerEncryptionPubKey) =>
      void useChatStore
        .getState()
        .updateDeliveryStatus(messageId, status, signerEncryptionPubKey),
    onSent: (messageId) =>
      void useChatStore.getState().updateDeliveryStatus(messageId, "sent"),
    onConnectionChange: (relayStatus) =>
      useChatStore.getState().setRelayStatus(relayStatus),
    onError: (error) =>
      useChatStore.setState({ transportError: error.message }),
  });
  return () => transportManager.stop();
}
```

Inside `client/lib/transport.ts`, `TransportManager` stores these callbacks in `this.callbacks`. The only bridge method is `setConnectionStatus` (line 329):

```ts
private setConnectionStatus(status: RelayStatus): void {
  if (this.lastConnectionStatus === status) return;
  this.lastConnectionStatus = status;
  this.callbacks?.onConnectionChange(status);
}
```

And `onError` is called directly from catch blocks (e.g., line 363, 601).

---

## 5. The `/chats` and `/lock` pages

`client/app/lock/page.tsx` (full):

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useVaultStore } from "../../store/useVaultStore";
import { useChatStore } from "../../store/useChatStore";
import { startChatServices } from "../../store/useChatStore";

export default function LockPage() {
  const router = useRouter();
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const sessionRestored = useVaultStore((state) => state.sessionRestored);
  const sessionRestoreError = useVaultStore((state) => state.sessionRestoreError);
  const unlockVault = useVaultStore((state) => state.unlockVault);

  useEffect(() => {
    if (sessionRestored && isUnlocked) {
      startChatServices();
      router.replace("/chats");
    }
  }, [sessionRestored, isUnlocked, router]);

  if (!sessionRestored) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-obsidian">
        <div className="glass-panel flex flex-col items-center gap-3 px-8 py-6">
          <div className="h-2 w-2 rounded-full bg-emerald shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
          <p className="font-mono text-xs uppercase tracking-widest text-zinc-400">
            Restoring session
          </p>
        </div>
      </div>
    );
  }

  if (!isUnlocked) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-obsidian">
        <div className="glass-panel w-full max-w-sm px-8 py-10">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-zinc-100">
            Cloak
          </h1>
          <p className="mt-2 text-sm text-zinc-400">Enter your passcode to unlock.</p>
          {sessionRestoreError && (
            <p className="mt-2 text-sm text-crimson">{sessionRestoreError}</p>
          )}
          <button
            onClick={() => unlockVault()}
            className="mt-6 w-full rounded-xl bg-zinc-100 py-3 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Unlock
          </button>
        </div>
      </div>
    );
  }

  return null;
}
```

Dependency array: `[sessionRestored, isUnlocked, router]`.

`client/app/chats/page.tsx` (full):

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { MessagesView } from "../../components/MessagesView";
import { ChatView } from "../../components/ChatView";
import { useChatStore } from "../../store/useChatStore";
import { useVaultStore } from "../../store/useVaultStore";
import { startChatServices } from "../../store/useChatStore";

type MobileView = "list" | "chat";

export default function ChatsPage() {
  const isUnlocked = useVaultStore((state) => state.isUnlocked);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const setActiveChat = useChatStore((state) => state.setActiveChat);
  const [mobileView, setMobileView] = useState<MobileView>("list");
  const startedRef = useRef(false);

  useEffect(() => {
    if (isUnlocked && !startedRef.current) {
      startedRef.current = true;
      startChatServices();
    }
  }, [isUnlocked]);

  if (!isUnlocked) return null;

  return (
    <div className="flex h-full w-full overflow-hidden">
      <div className="hidden md:flex md:w-80 lg:w-96 flex-col">
        <MessagesView
          activeChatId={activeChatId}
          onSelectChat={(id) => {
            setActiveChat(id);
          }}
        />
      </div>

      <div className="flex w-full flex-col md:hidden">
        {mobileView === "list" ? (
          <div className="flex-1">
            <MessagesView
              activeChatId={activeChatId}
              onSelectChat={(id) => {
                setActiveChat(id);
                setMobileView("chat");
              }}
            />
          </div>
        ) : (
          <div className="flex-1">
            <ChatView chatId={activeChatId} onBack={() => setMobileView("list")} />
          </div>
        )}
      </div>

      <main className="hidden flex-1 md:block">
        <ChatView chatId={activeChatId} />
      </main>
    </div>
  );
}
```

Dependency array: `[isUnlocked]`. `startedRef` is a mutable ref used to ensure `startChatServices()` runs only once per mount even if `isUnlocked` toggles true again.

---

## 6. Browser console test

I cannot run JavaScript in your browser from this terminal environment. There is no way for me to access your open DevTools console or the live page state. You need to paste that snippet into your browser console yourself and paste the output back here.

---

## 7. When does it happen?

I cannot observe your browser session, so I cannot tell you exactly when the error appears. Please tell me: does it happen immediately on load, after unlock, after navigating to /chats, when the Supabase channel flips state, or randomly? And what you did right before it appeared.

---

## Diagnosis

If your loop is React Error #185 (too many re-renders), the likely path is:

`TransportManager.setConnectionStatus` → `callbacks.onConnectionChange` → `useChatStore.getState().setRelayStatus` → Zustand `set(...)` → subscribers re-render (Header reads `relayStatus` via selector) → no state change → no infinite loop, because `setRelayStatus` has an early-return guard:

```ts
if (current.relayStatus === relayStatus && current.isRelayConnected === (relayStatus === "connected")) return;
```

So the store itself is protected. If you’re seeing a loop, it’s likely either:
- `startChatServices()` being called twice (lock page + chats page both fire it when `isUnlocked` flips, but `startedRef` in chats page and the router redirect in lock page should prevent double-start; verify by adding a `console.log` in `startChatServices`).
- A component re-rendering and causing `useEffect` to re-run, which re-calls `startChatServices` (check the dependency arrays above — `[isUnlocked]` and `[sessionRestored, isUnlocked, router]` are stable unless those values toggle).
