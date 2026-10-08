import {
  decryptVaultPayload,
  encryptVaultPayload,
} from "./crypto";
import { type SignedEnvelope, verifySignedEnvelope } from "./protocol";
import {
  database,
  type QueuedEnvelopeRecord,
} from "./vault";

export interface TransportCallbacks {
  onMessage: (packet: SignedEnvelope) => void | Promise<void>;
  onReceipt: (messageId: string, status: "delivered" | "read") => void;
  onSent: (messageId: string) => void;
  onConnectionChange: (connected: boolean) => void;
  onError: (error: Error) => void;
}

export type DeliveryResult = "sent" | "queued";

interface RelayAcknowledgement {
  status: "ok";
  id: string;
}

const ACK_TIMEOUT_MS = 10_000;
const MAX_BACKOFF_MS = 60_000;

function websocketRelayUrl(): string {
  if (process.env.NEXT_PUBLIC_CLOAK_RELAY_URL) {
    return process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
  }
  return process.env.NODE_ENV === "development"
    ? "ws://localhost:8080"
    : "wss://relay.cloak.messenger";
}

function httpRelayUrl(): string {
  if (process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL) {
    return process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;
  }
  const base = websocketRelayUrl()
    .replace(/^wss:/, "https:")
    .replace(/^ws:/, "http:");
  return `${base.replace(/\/+$/, "")}/relay`;
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

function isRelayAcknowledgement(
  value: unknown,
  expectedId: string,
): value is RelayAcknowledgement {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    value.status === "ok" &&
    "id" in value &&
    value.id === expectedId
  );
}

export class TransportManager {
  private vaultKey: Uint8Array | null = null;
  private callbacks: TransportCallbacks | null = null;
  private recipientPubKey: string | null = null;
  private socket: WebSocket | null = null;
  private connectPromise: Promise<WebSocket> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  private retryTimer: ReturnType<typeof setTimeout> | undefined;
  private reconnectAttempt = 0;
  private stopped = true;
  private draining = false;
  private messageProcessing: Promise<void> = Promise.resolve();
  private readonly acknowledgements = new Map<
    string,
    { resolve: () => void; reject: (error: Error) => void; timeout: number }
  >();

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
      }
      this.connect();
      this.drainQueue();
      return;
    }
    this.recipientPubKey = recipientPubKey;
    this.callbacks = callbacks;
  }

  stop(): void {
    this.stopped = true;
    this.vaultKey?.fill(0);
    this.vaultKey = null;
    this.recipientPubKey = null;
    this.callbacks?.onConnectionChange(false);
    this.callbacks = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onOnline);
    }
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.reconnectTimer = undefined;
    this.retryTimer = undefined;
    for (const pending of this.acknowledgements.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Relay transport was stopped."));
    }
    this.acknowledgements.clear();
    this.socket?.close();
    this.socket = null;
    this.connectPromise = null;
  }

  async enqueue(packet: SignedEnvelope): Promise<DeliveryResult> {
    const id = packet.id;
    await this.persistQueueItem(packet);
    if (!this.stopped && typeof navigator !== "undefined" && navigator.onLine) {
      this.drainQueue();
    }
    return "queued";
  }

  async publishReceipt(
    messageId: string,
    status: "delivered" | "read",
    recipientPubKey: string,
  ): Promise<void> {
    const id = crypto.randomUUID();
    const receipt = { type: "receipt", id, messageId, status, recipientPubKey };
    const socket = await this.connect();
    if (socket && socket.readyState === WebSocket.OPEN) {
      await new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          this.acknowledgements.delete(id);
          reject(new Error("Relay receipt acknowledgement timed out."));
        }, ACK_TIMEOUT_MS);
        this.acknowledgements.set(id, { resolve, reject, timeout });
        socket.send(JSON.stringify(receipt));
      });
      return;
    }

    const response = await fetch(httpRelayUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(receipt),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Relay rejected the delivery receipt (${response.status}).`);
    }
  }

  private readonly onOnline = (): void => {
    if (!this.stopped) {
      this.connect();
      this.drainQueue();
    }
  };

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

  private async connect(): Promise<WebSocket | null> {
    if (
      this.stopped ||
      typeof WebSocket === "undefined" ||
      (this.socket?.readyState === WebSocket.OPEN)
    ) {
      return this.socket;
    }
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = new Promise<WebSocket>((resolve, reject) => {
      let socket: WebSocket;
      try {
        socket = new WebSocket(websocketRelayUrl());
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Relay connection failed."));
        return;
      }
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error("Relay connection timed out."));
      }, ACK_TIMEOUT_MS);
      socket.onopen = () => {
        clearTimeout(timeout);
        this.socket = socket;
        this.reconnectAttempt = 0;
        this.callbacks?.onConnectionChange(true);
        if (this.recipientPubKey) {
          socket.send(
            JSON.stringify({
              type: "subscribe",
              id: crypto.randomUUID(),
              recipientPubKey: this.recipientPubKey,
            }),
          );
        }
        resolve(socket);
      };
      socket.onmessage = (event: MessageEvent<string>) => {
        this.messageProcessing = this.messageProcessing
          .then(() => this.handleSocketMessage(event.data))
          .catch((error: unknown) => {
            this.callbacks?.onError(
              error instanceof Error
                ? error
                : new Error("Could not process a relay message."),
            );
          });
      };
      socket.onerror = () => {
        clearTimeout(timeout);
        socket.close();
        reject(new Error("Relay WebSocket connection failed."));
      };
      socket.onclose = () => {
        clearTimeout(timeout);
        if (this.socket === socket) this.socket = null;
        this.callbacks?.onConnectionChange(false);
        this.scheduleReconnect();
      };
    }).finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise.catch(() => null);
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return;
    const delay = Math.min(1_000 * 2 ** this.reconnectAttempt, MAX_BACKOFF_MS);
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delay);
  }

  private async handleSocketMessage(data: string): Promise<void> {
    let parsed: unknown;
    try {
      parsed = JSON.parse(data);
    } catch {
      return;
    }
    if (typeof parsed !== "object" || parsed === null) return;
    if (
      "status" in parsed &&
      parsed.status === "ok" &&
      "id" in parsed &&
      typeof parsed.id === "string"
    ) {
      const pending = this.acknowledgements.get(parsed.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.acknowledgements.delete(parsed.id);
        if (isRelayAcknowledgement(parsed, parsed.id)) pending.resolve();
        else pending.reject(new Error("Relay rejected the message."));
      }
      return;
    }
    if ("type" in parsed && parsed.type === "receipt") {
      if (
        "messageId" in parsed &&
        typeof parsed.messageId === "string" &&
        "status" in parsed &&
        (parsed.status === "delivered" || parsed.status === "read")
      ) {
        this.callbacks?.onReceipt(parsed.messageId, parsed.status);
      }
      if ("id" in parsed && typeof parsed.id === "string") {
        this.acknowledgeRelayDelivery(parsed.id);
      }
      return;
    }
    const packet = parseSignedEnvelope(
      "packet" in parsed ? parsed.packet : parsed,
    );
    if (!packet || !(await verifySignedEnvelope(packet))) return;
    try {
      await this.callbacks?.onMessage(packet);
      this.acknowledgeRelayDelivery(packet.id);
    } catch (error) {
      this.callbacks?.onError(
        error instanceof Error ? error : new Error("Could not ingest relay message."),
      );
    }
  }

  private acknowledgeRelayDelivery(messageId: string): void {
    const socket = this.socket;
    if (
      !socket ||
      socket.readyState !== WebSocket.OPEN ||
      !this.recipientPubKey
    ) {
      return;
    }
    socket.send(
      JSON.stringify({
        type: "ack",
        id: crypto.randomUUID(),
        messageId,
        recipientPubKey: this.recipientPubKey,
      }),
    );
  }

  private async sendOverWebSocket(packet: SignedEnvelope): Promise<void> {
    const socket = await this.connect();
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      throw new Error("Relay WebSocket is offline.");
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.acknowledgements.delete(packet.id);
        reject(new Error("Relay acknowledgement timed out."));
      }, ACK_TIMEOUT_MS);
      this.acknowledgements.set(packet.id, { resolve, reject, timeout });
      socket.send(
        JSON.stringify({ type: "publish", id: packet.id, packet }),
      );
    });
  }

  private async sendOverHttp(packet: SignedEnvelope): Promise<void> {
    const response = await fetch(httpRelayUrl(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "publish", id: packet.id, packet }),
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`HTTP relay rejected the message (${response.status}).`);
    }
    const acknowledgement: unknown = await response.json();
    if (!isRelayAcknowledgement(acknowledgement, packet.id)) {
      throw new Error("HTTP relay returned an invalid acknowledgement.");
    }
  }

  private async deliver(packet: SignedEnvelope): Promise<void> {
    try {
      await this.sendOverWebSocket(packet);
    } catch (websocketError) {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        throw websocketError;
      }
      try {
        await this.sendOverHttp(packet);
      } catch (httpError) {
        throw new Error(
          `Relay delivery failed over WebSocket and HTTP: ${
            httpError instanceof Error ? httpError.message : "HTTP relay error"
          }; ${
            websocketError instanceof Error
              ? websocketError.message
              : "WebSocket relay error"
          }`,
        );
      }
    }
  }

  private async drainQueue(): Promise<void> {
    if (
      this.draining ||
      this.stopped ||
      !this.vaultKey ||
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
          await this.deliver(packet);
          await database.outbox.delete(record.id);
          this.callbacks?.onSent(record.id);
        } catch (error) {
          this.callbacks?.onError(
            error instanceof Error
              ? error
              : new Error("Queued relay message delivery failed."),
          );
          const attempts = record.attempts + 1;
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
      this.drainQueue();
    }, delay);
  }
}

export const transportManager = new TransportManager();
