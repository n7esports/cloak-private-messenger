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
  onConnectionChange: (status: "connecting" | "connected" | "disconnected") => void;
  onError: (error: Error) => void;
}

export type DeliveryResult = "sent" | "queued";

export interface RelayEndpoints {
  websocketUrl: string | null;
  httpUrl: string | null;
}

type RelayConnectionStatus = "connecting" | "connected" | "disconnected";

interface RelayAcknowledgement {
  status: "ok";
  id: string;
}

const ACK_TIMEOUT_MS = 10_000;
const MAX_BACKOFF_MS = 60_000;

function parseEndpoint(value: string, allowedProtocols: string[]): URL | null {
  try {
    const url = new URL(value);
    if (
      !allowedProtocols.includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function parseWebSocketEndpoint(value: string, base?: string): URL | null {
  try {
    const url = new URL(value, base);
    if (
      !["wss:", "ws:", "https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }
    url.protocol =
      url.protocol === "https:" || url.protocol === "wss:" ? "wss:" : "ws:";
    return url;
  } catch {
    return null;
  }
}

function isSafeForCurrentPage(url: URL): boolean {
  return !(
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    url.protocol === "http:" &&
    url.hostname !== "localhost" &&
    url.hostname !== "127.0.0.1" &&
    url.hostname !== "[::1]"
  );
}

export function resolveRelayEndpoints(): RelayEndpoints {
  const configuredWebSocket = process.env.NEXT_PUBLIC_CLOAK_RELAY_URL?.trim();
  const configuredWsUrl = process.env.NEXT_PUBLIC_WS_URL?.trim();
  const configuredHttp = process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL?.trim();
  const configuredBackend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();

  let websocketUrl: URL | null = null;
  let httpUrl: URL | null = null;

  const configuredWebSocketUrl = configuredWebSocket || configuredWsUrl;
  if (configuredWebSocketUrl) {
    const backendBase = configuredBackend
      ? parseEndpoint(configuredBackend, ["https:", "http:", "wss:", "ws:"])
      : null;
    const relativeBase =
      backendBase?.toString() ??
      (typeof window !== "undefined" ? window.location.origin : undefined);
    websocketUrl = parseWebSocketEndpoint(
      configuredWebSocketUrl,
      relativeBase,
    );
  } else if (configuredBackend) {
    const backendUrl = parseEndpoint(configuredBackend, [
      "https:",
      "http:",
      "wss:",
      "ws:",
    ]);
    if (backendUrl) {
      websocketUrl = parseWebSocketEndpoint(backendUrl.toString());
    }
  } else if (
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname === "[::1]")
  ) {
    websocketUrl = new URL("ws://localhost:8080");
  }

  if (configuredHttp) {
    httpUrl = parseEndpoint(configuredHttp, ["https:", "http:"]);
  } else if (websocketUrl) {
    httpUrl = new URL(websocketUrl);
    httpUrl.protocol = websocketUrl.protocol === "wss:" ? "https:" : "http:";
    if (!httpUrl.pathname.replace(/\/+$/, "").endsWith("/relay")) {
      httpUrl.pathname = `${httpUrl.pathname.replace(/\/+$/, "")}/relay`;
    }
    httpUrl.search = "";
  }

  if (websocketUrl && !isSafeForCurrentPage(websocketUrl)) {
    websocketUrl = null;
  }
  if (httpUrl && !isSafeForCurrentPage(httpUrl)) httpUrl = null;

  return {
    websocketUrl: websocketUrl?.toString() ?? null,
    httpUrl: httpUrl?.toString() ?? null,
  };
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
  private readonly onOffline = (): void => {
    const socket = this.socket;
    this.socket = null;
    socket?.close();
    this.callbacks?.onConnectionChange("disconnected");
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
      const endpoints = resolveRelayEndpoints();
      if (endpoints.websocketUrl) {
        this.connect();
      } else {
        callbacks.onConnectionChange("disconnected");
      }
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
    this.callbacks?.onConnectionChange("disconnected");
    this.callbacks = null;
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onOnline);
      window.removeEventListener("offline", this.onOffline);
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

    const relayUrl = resolveRelayEndpoints().httpUrl;
    if (!relayUrl) throw new Error("No HTTP relay is configured.");
    const response = await fetch(relayUrl, {
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
      if (resolveRelayEndpoints().websocketUrl) this.connect();
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
    const relayUrl = resolveRelayEndpoints().websocketUrl;
    if (
      this.stopped ||
      !relayUrl ||
      typeof WebSocket === "undefined" ||
      (this.socket?.readyState === WebSocket.OPEN)
    ) {
      return this.socket;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      this.callbacks?.onConnectionChange("disconnected");
      return null;
    }
    if (this.connectPromise) return this.connectPromise;

    this.callbacks?.onConnectionChange("connecting");
    this.connectPromise = new Promise<WebSocket>((resolve, reject) => {
      let socket: WebSocket;
      let settled = false;
      let connectionTimeout: ReturnType<typeof setTimeout> | undefined;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        if (connectionTimeout !== undefined) {
          clearTimeout(connectionTimeout);
        }
        reject(error);
      };
      try {
        socket = new WebSocket(relayUrl);
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Relay connection failed."));
        return;
      }
      this.socket = socket;
      connectionTimeout = setTimeout(() => {
        if (this.socket === socket) this.socket = null;
        socket.close();
        fail(new Error("Relay WebSocket handshake timed out."));
      }, ACK_TIMEOUT_MS);
      socket.onopen = () => {
        try {
          if (this.recipientPubKey) {
            const subscriptionId = crypto.randomUUID();
            const subscriptionAcknowledgement = new Promise<void>(
              (ackResolve, ackReject) => {
                const timeout = window.setTimeout(() => {
                  this.acknowledgements.delete(subscriptionId);
                  ackReject(
                    new Error("Relay subscription acknowledgement timed out."),
                  );
                }, ACK_TIMEOUT_MS);
                this.acknowledgements.set(subscriptionId, {
                  resolve: ackResolve,
                  reject: ackReject,
                  timeout,
                });
              },
            );
            socket.send(
              JSON.stringify({
                type: "subscribe",
                id: subscriptionId,
                recipientPubKey: this.recipientPubKey,
              }),
            );
            void subscriptionAcknowledgement.then(
              () => {
                if (settled || this.socket !== socket || socket.readyState !== WebSocket.OPEN) {
                  return;
                }
                settled = true;
                clearTimeout(connectionTimeout);
                this.reconnectAttempt = 0;
                this.callbacks?.onConnectionChange("connected");
                resolve(socket);
                void this.drainQueue();
              },
              (error: unknown) => {
                socket.close();
                fail(
                  error instanceof Error
                    ? error
                    : new Error("Relay subscription handshake failed."),
                );
              },
            );
            return;
          }
          settled = true;
          clearTimeout(connectionTimeout);
          this.reconnectAttempt = 0;
          this.callbacks?.onConnectionChange("connected");
          resolve(socket);
          void this.drainQueue();
        } catch (error) {
          socket.close();
          fail(
            error instanceof Error
              ? error
              : new Error("Could not subscribe to the relay."),
          );
        }
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
        const error = new Error("Relay WebSocket connection failed.");
        this.callbacks?.onError(error);
        socket.close();
        fail(error);
      };
      socket.onclose = (event: CloseEvent) => {
        clearTimeout(connectionTimeout);
        if (this.socket === socket) {
          this.socket = null;
          this.callbacks?.onConnectionChange("disconnected");
          this.scheduleReconnect();
        }
        if (!settled) {
          fail(
            new Error(
              `Relay WebSocket closed before connection was established (code ${event.code}${event.reason ? `: ${event.reason}` : ""}).`,
            ),
          );
        }
      };
    }).finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise.catch(() => {
      this.callbacks?.onConnectionChange("disconnected");
      this.scheduleReconnect();
      return null;
    });
  }

  private scheduleReconnect(): void {
    if (
      this.stopped ||
      !resolveRelayEndpoints().websocketUrl ||
      (typeof navigator !== "undefined" && !navigator.onLine) ||
      this.reconnectTimer
    ) return;
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
      "id" in parsed &&
      typeof parsed.id === "string"
    ) {
      const pending = this.acknowledgements.get(parsed.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.acknowledgements.delete(parsed.id);
        if (isRelayAcknowledgement(parsed, parsed.id)) {
          pending.resolve();
        } else if (
          parsed.status === "error" &&
          "message" in parsed &&
          typeof parsed.message === "string"
        ) {
          pending.reject(new Error(`Relay rejected the request: ${parsed.message}`));
        } else {
          pending.reject(new Error("Relay returned an invalid acknowledgement."));
        }
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
    const relayUrl = resolveRelayEndpoints().httpUrl;
    if (!relayUrl) throw new Error("No HTTP relay is configured.");
    const response = await fetch(relayUrl, {
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
    let websocketError: unknown;
    if (resolveRelayEndpoints().websocketUrl) {
      try {
        await this.sendOverWebSocket(packet);
        return;
      } catch (error) {
        websocketError = error;
      }
    }

    const httpUrl = resolveRelayEndpoints().httpUrl;
    if (!httpUrl) {
      throw new Error(
        "No relay is configured. The message remains encrypted in the local outbox.",
      );
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw websocketError instanceof Error
        ? websocketError
        : new Error("The device is offline.");
    }

    try {
      await this.sendOverHttp(packet);
    } catch (httpError) {
      if (!websocketError) throw httpError;
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

  private async drainQueue(): Promise<void> {
    if (
      this.draining ||
      this.stopped ||
      !this.vaultKey ||
      (!resolveRelayEndpoints().websocketUrl &&
        !resolveRelayEndpoints().httpUrl) ||
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
