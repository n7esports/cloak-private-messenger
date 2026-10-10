import type { RealtimeChannel } from "@supabase/supabase-js";
import {
  decryptVaultPayload,
  encryptVaultPayload,
} from "./crypto";
import {
  decodeBytes,
  encodeBytes,
  type SignedEnvelope,
  type TypingSignal,
  verifySignedEnvelope,
  verifyTypingSignal,
} from "./protocol";
import {
  database,
  type QueuedEnvelopeRecord,
} from "./vault";

export interface TransportCallbacks {
  onMessage: (packet: SignedEnvelope) => void | Promise<void>;
  onReceipt: (messageId: string, status: "delivered" | "read") => void;
  onSent: (messageId: string) => void;
  onConnectionChange: (status: "connecting" | "connected" | "disconnected") => void;
  onTyping?: (signal: TypingSignal) => void;
  onError: (error: Error) => void;
}

export type DeliveryResult = "sent" | "queued";
export type RelayStatus = "connecting" | "connected" | "disconnected";
type BroadcastStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

interface BroadcastPayload {
  packet?: unknown;
  messageId?: unknown;
  status?: unknown;
}

const ACK_TIMEOUT_MS = 10_000;
const MAX_BACKOFF_MS = 60_000;
// L5: a queued message that never delivers must not be retried forever. After
// this many failures it is dropped from the outbox so stale envelopes do not
// accumulate indefinitely; the caller is still notified via onError.
const MAX_QUEUE_ATTEMPTS = 10;

export function getInboxChannelName(publicKey: string): string {
  const keyBytes = decodeBytes(publicKey);
  if (
    keyBytes.length !== 32 ||
    encodeBytes(keyBytes) !== publicKey
  ) {
    throw new Error("Relay inbox requires a canonical 32-byte public key.");
  }
  const topicKey = publicKey
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return `cloak-inbox-${topicKey}`;
}

function parseSignedEnvelope(value: unknown): SignedEnvelope | null {
  if (typeof value !== "object" || value === null) return null;
  if (
    !("type" in value) ||
    value.type !== "message" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("senderPubKey" in value) ||
    typeof value.senderPubKey !== "string" ||
    !("senderEncryptionPubKey" in value) ||
    typeof value.senderEncryptionPubKey !== "string" ||
    !("signature" in value) ||
    typeof value.signature !== "string" ||
    !("envelope" in value) ||
    typeof value.envelope !== "object" ||
    value.envelope === null
  ) {
    return null;
  }

  const envelope = value.envelope;
  if (
    !("recipientPubKey" in envelope) ||
    typeof envelope.recipientPubKey !== "string" ||
    !("ephemeralPubKey" in envelope) ||
    typeof envelope.ephemeralPubKey !== "string" ||
    !("nonce" in envelope) ||
    typeof envelope.nonce !== "string" ||
    !("ciphertext" in envelope) ||
    typeof envelope.ciphertext !== "string" ||
    !("timestamp" in envelope) ||
    typeof envelope.timestamp !== "number"
  ) {
    return null;
  }

  return {
    type: "message",
    id: value.id,
    senderPubKey: value.senderPubKey,
    senderEncryptionPubKey: value.senderEncryptionPubKey,
    signature: value.signature,
    envelope: {
      recipientPubKey: envelope.recipientPubKey,
      ephemeralPubKey: envelope.ephemeralPubKey,
      nonce: envelope.nonce,
      ciphertext: envelope.ciphertext,
      timestamp: envelope.timestamp,
    },
  };
}

function parseTypingSignal(value: unknown): TypingSignal | null {
  if (typeof value !== "object" || value === null) return null;
  if (
    !("type" in value) ||
    value.type !== "typing" ||
    !("id" in value) ||
    typeof value.id !== "string" ||
    !("senderPubKey" in value) ||
    typeof value.senderPubKey !== "string" ||
    !("senderEncryptionPubKey" in value) ||
    typeof value.senderEncryptionPubKey !== "string" ||
    !("recipientPubKey" in value) ||
    typeof value.recipientPubKey !== "string" ||
    !("sealed" in value) ||
    typeof value.sealed !== "string" ||
    !("signature" in value) ||
    typeof value.signature !== "string" ||
    !("timestamp" in value) ||
    typeof value.timestamp !== "number"
  ) {
    return null;
  }
  return {
    type: "typing",
    id: value.id,
    senderPubKey: value.senderPubKey,
    senderEncryptionPubKey: value.senderEncryptionPubKey,
    recipientPubKey: value.recipientPubKey,
    sealed: value.sealed,
    signature: value.signature,
    timestamp: value.timestamp,
  };
}

function isBroadcastStatus(status: string): status is BroadcastStatus {
  return (
    status === "SUBSCRIBED" ||
    status === "CHANNEL_ERROR" ||
    status === "TIMED_OUT" ||
    status === "CLOSED"
  );
}

export class TransportManager {
  private vaultKey: Uint8Array | null = null;
  private callbacks: TransportCallbacks | null = null;
  private recipientPubKey: string | null = null;
  private supabaseClient:
    | typeof import("../src/lib/supabaseClient.js")["supabase"]
    | null = null;
  private inboxChannel: RealtimeChannel | null = null;
  private readonly channels = new Map<string, RealtimeChannel>();
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectAttempt = 0;
  private stopped = true;
  private draining = false;
  private messageProcessing: Promise<void> = Promise.resolve();

  private readonly onOffline = (): void => {
    this.connectPromise = null;
    this.setConnectionStatus("disconnected");
    this.removeChannels();
  };

  start(
    vaultKey: Uint8Array,
    recipientPubKey: string,
    callbacks: TransportCallbacks,
  ): void {
    if (this.stopped) {
      this.vaultKey?.fill(0);
      this.vaultKey = vaultKey.slice();
      this.recipientPubKey = recipientPubKey;
      this.callbacks = callbacks;
      this.stopped = false;
      if (typeof window !== "undefined") {
        window.addEventListener("online", this.onOnline);
        window.addEventListener("offline", this.onOffline);
      }
      void this.connect();
      return;
    }

    this.recipientPubKey = recipientPubKey;
    this.callbacks = callbacks;
  }

  stop(): void {
    this.stopped = true;
    this.connectPromise = null;
    this.vaultKey?.fill(0);
    this.vaultKey = null;
    this.recipientPubKey = null;
    this.setConnectionStatus("disconnected");
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onOnline);
      window.removeEventListener("offline", this.onOffline);
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.reconnectTimer = undefined;
    this.retryTimer = undefined;
    this.removeChannels();
    this.connectPromise = null;
    this.callbacks = null;
  }

  async enqueue(packet: SignedEnvelope): Promise<DeliveryResult> {
    await this.persistQueueItem(packet);
    if (
      !this.stopped &&
      (this.inboxChannel ||
        typeof navigator === "undefined" ||
        navigator.onLine)
    ) {
      void this.drainQueue();
    }
    return "queued";
  }

  async sendEnvelope(packet: SignedEnvelope): Promise<void> {
    const recipientPubKey = packet.envelope.recipientPubKey;
    const channel = await this.getBroadcastChannel(recipientPubKey);
    const result = await channel.send({
      type: "broadcast",
      event: "envelope",
      payload: { packet },
    });
    if (result !== "ok") {
      const error = new Error(`Supabase envelope broadcast failed (${result}).`);
      this.handleConnectionFailure(error);
      throw error;
    }
  }

  async publishReceipt(
    messageId: string,
    status: "delivered" | "read",
    recipientPubKey: string,
  ): Promise<void> {
    const channel = await this.getBroadcastChannel(recipientPubKey);
    const result = await channel.send({
      type: "broadcast",
      event: "receipt",
      payload: { messageId, status },
    });
    if (result !== "ok") {
      const error = new Error(`Supabase receipt broadcast failed (${result}).`);
      this.handleConnectionFailure(error);
      throw error;
    }
  }

  /**
   * Fire-and-forget E2EE typing signal. It is never queued for offline
   * delivery (a stale typing indicator is worse than none) and never touches
   * the message ratchet.
   */
  async sendTyping(signal: TypingSignal): Promise<void> {
    if (this.stopped) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    const channel = await this.getBroadcastChannel(signal.recipientPubKey);
    const result = await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { signal },
    });
    if (result !== "ok") {
      throw new Error(`Supabase typing broadcast failed (${result}).`);
    }
  }

  private readonly onOnline = (): void => {
    if (this.stopped) return;
    void this.connect();
  };

  private setConnectionStatus(status: RelayStatus): void {
    this.callbacks?.onConnectionChange(status);
  }

  private async getSupabaseClient() {
    if (this.supabaseClient) return this.supabaseClient;
    const { supabase } = await import("../src/lib/supabaseClient.js");
    this.supabaseClient = supabase;
    return supabase;
  }

  private connect(): Promise<void> {
    if (this.stopped || !this.recipientPubKey) return Promise.resolve();
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.setConnectionStatus("disconnected");
      return Promise.resolve();
    }
    if (this.inboxChannel) return Promise.resolve();
    if (this.connectPromise) return this.connectPromise;

    this.setConnectionStatus("connecting");
    let trackedAttempt: Promise<void>;
    trackedAttempt = this.openInboxChannel()
      .catch((error: unknown) => {
        const cause =
          error instanceof Error
            ? error
            : new Error("Could not subscribe to the Supabase inbox channel.");
        this.setConnectionStatus("disconnected");
        this.callbacks?.onError(cause);
        this.scheduleReconnect();
      })
      .finally(() => {
        if (this.connectPromise === trackedAttempt) {
          this.connectPromise = null;
        }
      });
    this.connectPromise = trackedAttempt;
    return trackedAttempt;
  }

  private async openInboxChannel(): Promise<void> {
    const supabase = await this.getSupabaseClient();
    if (this.stopped || !this.recipientPubKey || this.inboxChannel) return;
    const channelName = getInboxChannelName(this.recipientPubKey);
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    this.inboxChannel = channel;
    this.channels.set(channelName, channel);

    channel.on(
      "broadcast",
      { event: "envelope" },
      (event: { payload?: BroadcastPayload }) => {
        this.messageProcessing = this.messageProcessing
          .then(() => this.handleEnvelope(event.payload?.packet ?? event.payload))
          .catch((error: unknown) => {
            this.callbacks?.onError(
              error instanceof Error
                ? error
                : new Error("Could not process a broadcast envelope."),
            );
          });
      },
    );
    channel.on(
      "broadcast",
      { event: "receipt" },
      (event: { payload?: BroadcastPayload }) => {
        const payload = event.payload;
        if (
          typeof payload?.messageId === "string" &&
          (payload.status === "delivered" || payload.status === "read")
        ) {
          this.callbacks?.onReceipt(payload.messageId, payload.status);
        }
      },
    );
    channel.on(
      "broadcast",
      { event: "typing" },
      (event: { payload?: { signal?: unknown } }) => {
        const signal = parseTypingSignal(event.payload?.signal);
        if (!signal) return;
        this.messageProcessing = this.messageProcessing
          .then(async () => {
            if (!(await verifyTypingSignal(signal))) return;
            this.callbacks?.onTyping?.(signal);
          })
          .catch((error: unknown) => {
            this.callbacks?.onError(
              error instanceof Error
                ? error
                : new Error("Could not process a typing signal."),
            );
          });
      },
    );

    const connectionAttempt = new Promise<void>((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new Error("Timed out subscribing to the Supabase inbox channel."));
      }, ACK_TIMEOUT_MS);

      channel.subscribe((status: string, error?: Error) => {
        if (!isBroadcastStatus(status)) return;
        if (status === "SUBSCRIBED") {
          if (this.stopped || this.inboxChannel !== channel) return;
          this.reconnectAttempt = 0;
          this.setConnectionStatus("connected");
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve();
          }
          void this.drainQueue();
          return;
        }

        if (this.inboxChannel !== channel || this.stopped) return;
        const cause =
          error ??
          new Error(`Supabase broadcast channel status: ${status}.`);
        this.setConnectionStatus("disconnected");
        if (!settled) {
          settled = true;
          clearTimeout(timeout);
          reject(cause);
        } else if (status !== "CLOSED") {
          this.callbacks?.onError(cause);
        }
        this.dropChannel(channelName, channel);
        this.scheduleReconnect();
      });
    });
    try {
      await connectionAttempt;
    } catch (error) {
      if (this.inboxChannel === channel) {
        this.dropChannel(channelName, channel);
      }
      throw error;
    }
  }

  private async handleEnvelope(value: unknown): Promise<void> {
    const packet = parseSignedEnvelope(value);
    if (!packet || !(await verifySignedEnvelope(packet))) return;
    try {
      await this.callbacks?.onMessage(packet);
    } catch (error) {
      this.callbacks?.onError(
        error instanceof Error
          ? error
          : new Error("Could not ingest broadcast envelope."),
      );
    }
  }

  private async getBroadcastChannel(
    recipientPubKey: string,
  ): Promise<RealtimeChannel> {
    if (this.stopped) throw new Error("Relay transport is not running.");
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new Error("The device is offline; the envelope remains queued.");
    }
    const channelName = getInboxChannelName(recipientPubKey);
    const existing = this.channels.get(channelName);
    if (existing) return existing;

    const supabase = await this.getSupabaseClient();
    const channel = supabase.channel(channelName, {
      config: { broadcast: { self: false } },
    });
    this.channels.set(channelName, channel);

    try {
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error("Timed out subscribing to the recipient inbox."));
        }, ACK_TIMEOUT_MS);
        channel.subscribe((status: string, error?: Error) => {
          if (!isBroadcastStatus(status)) return;
          if (status === "SUBSCRIBED") {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            resolve();
          } else if (!settled) {
            settled = true;
            clearTimeout(timeout);
            reject(
              error ??
                new Error(`Recipient inbox subscription failed: ${status}.`),
            );
          } else {
            const cause =
              error ??
              new Error(`Recipient inbox channel status: ${status}.`);
            this.callbacks?.onError(cause);
            this.dropChannel(channelName, channel);
            this.handleConnectionFailure(cause);
          }
        });
      });
      return channel;
    } catch (error) {
      this.dropChannel(channelName, channel);
      this.handleConnectionFailure(
        error instanceof Error
          ? error
          : new Error("Recipient inbox subscription failed."),
      );
      throw error;
    }
  }

  private scheduleReconnect(): void {
    if (
      this.stopped ||
      this.reconnectTimer ||
      (typeof navigator !== "undefined" && !navigator.onLine)
    ) {
      return;
    }
    const delay = Math.min(1_000 * 2 ** this.reconnectAttempt, MAX_BACKOFF_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      void this.connect();
    }, delay);
  }

  private handleConnectionFailure(error: Error): void {
    this.callbacks?.onError(error);
    this.setConnectionStatus("disconnected");
    this.removeChannels();
    this.scheduleReconnect();
  }

  private async persistQueueItem(packet: SignedEnvelope): Promise<void> {
    const key = this.vaultKey;
    if (!key) throw new Error("The vault must be unlocked to queue messages.");
    const { initCrypto } = await import("./crypto");
    const sodium = await initCrypto();
    const plaintext = sodium.from_string(JSON.stringify(packet));
    try {
      const encrypted = await encryptVaultPayload(plaintext, key);
      await database.outbox.put({
        id: packet.id,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        attempts: 0,
        nextAttemptAt: Date.now(),
        createdAt: Date.now(),
      });
    } finally {
      plaintext.fill(0);
    }
  }

  private async readQueueItem(
    record: QueuedEnvelopeRecord,
  ): Promise<SignedEnvelope> {
    const key = this.vaultKey;
    if (!key) throw new Error("The vault is locked.");
    const plaintext = await decryptVaultPayload(
      record.ciphertext,
      record.nonce,
      key,
    );
    try {
      const parsed: unknown = JSON.parse(new TextDecoder().decode(plaintext));
      const packet = parseSignedEnvelope(parsed);
      if (!packet || packet.id !== record.id) {
        throw new Error("Encrypted relay queue entry is invalid.");
      }
      return packet;
    } finally {
      plaintext.fill(0);
    }
  }

  private dropChannel(name: string, channel: RealtimeChannel): void {
    if (this.channels.get(name) === channel) this.channels.delete(name);
    if (this.inboxChannel === channel) this.inboxChannel = null;
    const supabase = this.supabaseClient;
    if (!supabase) return;
    void supabase.removeChannel(channel).then((status) => {
      if (status === "error") {
        this.callbacks?.onError(new Error(`Could not remove Supabase channel ${name}.`));
      }
    }).catch((error: unknown) => {
      this.callbacks?.onError(
        error instanceof Error
          ? error
          : new Error(`Could not remove Supabase channel ${name}.`),
      );
    });
  }

  private removeChannels(): void {
    const channels = [...new Set(this.channels.values())];
    this.channels.clear();
    this.inboxChannel = null;
    const supabase = this.supabaseClient;
    if (!supabase) return;
    for (const channel of channels) {
      void supabase.removeChannel(channel).then((status) => {
        if (status === "error" && !this.stopped) {
          this.callbacks?.onError(new Error("Could not close a Supabase channel."));
        }
      }).catch((error: unknown) => {
        if (!this.stopped) {
          this.callbacks?.onError(
            error instanceof Error
              ? error
              : new Error("Could not close a Supabase channel."),
          );
        }
      });
    }
  }

  private async drainQueue(): Promise<void> {
    if (
      this.draining ||
      this.stopped ||
      !this.vaultKey ||
      !this.inboxChannel ||
      (typeof navigator !== "undefined" && !navigator.onLine)
    ) {
      return;
    }
    this.draining = true;
    try {
      const pendingRecords = await database.outbox
        .orderBy("createdAt")
        .toArray();
      for (const record of pendingRecords) {
        if (this.stopped || !this.vaultKey) break;
        if (record.nextAttemptAt > Date.now()) continue;
        try {
          const packet = await this.readQueueItem(record);
          await this.sendEnvelope(packet);
          await database.outbox.delete(record.id);
          this.callbacks?.onSent(record.id);
        } catch (error) {
          this.callbacks?.onError(
            error instanceof Error
              ? error
              : new Error("Queued broadcast delivery failed."),
          );
          const attempts = record.attempts + 1;
          if (attempts >= MAX_QUEUE_ATTEMPTS) {
            // Dead-letter: stop retrying a permanently failing envelope.
            await database.outbox.delete(record.id);
            continue;
          }
          const backoff = Math.min(1_000 * 2 ** (attempts - 1), MAX_BACKOFF_MS);
          await database.outbox.update(record.id, {
            attempts,
            nextAttemptAt: Date.now() + backoff,
          });
          this.scheduleQueueRetry(backoff);
          break;
        }
      }
    } finally {
      this.draining = false;
    }
  }

  private scheduleQueueRetry(delay: number): void {
    if (this.retryTimer || this.stopped) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.drainQueue();
    }, delay);
  }
}

export const transportManager = new TransportManager();
