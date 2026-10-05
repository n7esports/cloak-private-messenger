// client/src/lib/websocketClient.js

import {
  decryptPayload,
  deriveSharedSecret,
  encryptPayload,
  generateEphemeralKeyPair,
} from "../../../crypto-engine/src/index.js";

const WS_URL = "ws://localhost:8080";
const POLL_INTERVAL = 3000;
const REQUEST_TIMEOUT = 5000;

export const MESSAGE_TYPES = {
  PUSH_MESSAGE: "PUSH_MESSAGE",
  PULL_MESSAGE: "PULL_MESSAGE",
};

export class WebSocketClient {
  constructor({
    url = WS_URL,
    pollInterval = POLL_INTERVAL,
    onMessage,
    onStatusChange,
    onError,
  } = {}) {
    this.url = url;
    this.pollInterval = pollInterval;

    this.onMessage = onMessage || (() => {});
    this.onStatusChange = onStatusChange || (() => {});
    this.onError = onError || (() => {});

    this.socket = null;
    this.pollTimer = null;
    this.pendingRequests = new Map();
    this.requestCounter = 0;
    this.queueIds = new Set();
    this.pollsInFlight = new Set();
    this.shouldReconnect = true;
    this.reconnectTimer = null;
    this.connectionPromise = null;
  }

  connect() {
    if (
      this.socket &&
      this.socket.readyState === WebSocket.OPEN
    ) {
      return Promise.resolve();
    }

    if (this.socket?.readyState === WebSocket.CONNECTING) {
      return this.connectionPromise;
    }

    if (typeof window === "undefined") {
      return Promise.reject(new Error("WebSocket is only available in a browser."));
    }

    this.shouldReconnect = true;
    this.onStatusChange("connecting");

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);
      } catch (error) {
        this.connectionPromise = null;
        this.onStatusChange("error");
        this.onError(error);
        reject(error);
        this.scheduleReconnect();
        return;
      }

      const socket = this.socket;

      socket.onopen = () => {
        this.onStatusChange("connected");
        this.connectionPromise = null;
        this.startPolling();
        resolve();
      };

      socket.onmessage = (event) => {
        this.handleIncomingData(event.data);
      };

      socket.onerror = (error) => {
        this.onStatusChange("error");
        this.onError(error);
        if (this.connectionPromise) {
          this.connectionPromise = null;
          reject(new Error("Unable to connect to the WebSocket server."));
        }
      };

      socket.onclose = () => {
        this.stopPolling();
        this.onStatusChange("disconnected");
        if (this.connectionPromise) {
          this.connectionPromise = null;
          reject(new Error("WebSocket connection closed before opening."));
        }

        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };
    });

    return this.connectionPromise;
  }

  disconnect() {
    this.shouldReconnect = false;

    this.stopPolling();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  scheduleReconnect() {
    if (!this.shouldReconnect || this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, 2000);
  }

  startPolling(intervalMs = this.pollInterval) {
    this.pollInterval = intervalMs;
    this.stopPolling();

    this.pollTimer = setInterval(() => {
      this.queueIds.forEach((id) => this.pullMessages(id));
    }, this.pollInterval);

    this.queueIds.forEach((id) => this.pullMessages(id));
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  addPollingQueue(queueId) {
    if (queueId) this.queueIds.add(queueId);
    if (this.pollTimer) {
      this.queueIds.forEach((id) => this.pullMessages(id));
    }
  }

  stopAllPolling() {
    this.queueIds.clear();
    this.pollsInFlight.clear();
    this.stopPolling();
  }

  createRequestId() {
    this.requestCounter += 1;

    return `${Date.now()}-${this.requestCounter}-${Math.random()
      .toString(36)
      .slice(2)}`;
  }

  send(payload) {
    return new Promise((resolve, reject) => {
      if (
        !this.socket ||
        this.socket.readyState !== WebSocket.OPEN
      ) {
        reject(new Error("WebSocket is not connected."));
        return;
      }

      const requestId = payload.id || this.createRequestId();

      const message = {
        ...payload,
        id: requestId,
      };

      this.pendingRequests.set(requestId, {
        resolve,
        reject,
      });

      try {
        this.socket.send(JSON.stringify(message));
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            reject(new Error("Timed out waiting for the relay server."));
          }
        }, REQUEST_TIMEOUT);
      } catch (error) {
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  createQueue() {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
        reject(new Error("WebSocket is not connected."));
        return;
      }

      const socket = this.socket;
      const id = this.createRequestId();
      const timeout = setTimeout(() => {
        socket.removeEventListener("message", onMessage);
        reject(new Error("Timed out waiting for the relay to create a queue."));
      }, 5000);

      const onMessage = (event) => {
        let response;
        try {
          response = JSON.parse(event.data);
        } catch {
          return;
        }
        if (
          response.id !== id ||
          response.action !== "create"
        ) {
          return;
        }

        clearTimeout(timeout);
        socket.removeEventListener("message", onMessage);
        if (response.status !== "ok" || !response.queueId) {
          reject(new Error(response.message || "The relay could not create a queue."));
          return;
        }
        resolve(response);
      };

      socket.addEventListener("message", onMessage);
      try {
        socket.send(JSON.stringify({ action: "create", id }));
      } catch (error) {
        clearTimeout(timeout);
        socket.removeEventListener("message", onMessage);
        reject(error);
      }
    });
  }

  pushMessage({ queueId, payload, message }) {
    return this.send({
      action: "push",
      queueId,
      payload: payload ?? message,
    });
  }

  pullMessages(queueId) {
    if (
      !this.socket ||
      this.socket.readyState !== WebSocket.OPEN ||
      !queueId ||
      this.pollsInFlight.has(queueId)
    ) {
      return;
    }

    this.pollsInFlight.add(queueId);
    this.send({ action: "pull", queueId })
      .catch((error) => this.onError(error))
      .finally(() => this.pollsInFlight.delete(queueId));
  }

  handleIncomingData(rawData) {
    let data;

    try {
      data =
        typeof rawData === "string"
          ? JSON.parse(rawData)
          : rawData;
    } catch (error) {
      this.onError(
        new Error("Received invalid JSON from WebSocket server.")
      );
      return;
    }

    // Resolve request acknowledgement.
    const requestId = data.id ?? data.requestId;
    if (requestId && this.pendingRequests.has(requestId)) {
      const request = this.pendingRequests.get(requestId);

      this.pendingRequests.delete(requestId);

      if (data.error || data.status === "error" || data.action === "error") {
        request.reject(new Error(data.error || data.message || "Relay request failed."));
      } else {
        request.resolve(data);
      }
    }

    // Queue responses can use either messages or a queue array.
    if (Array.isArray(data.messages)) {
      data.messages.forEach((message) => {
        this.onMessage(message);
      });
    }

    if (data.message) {
      this.onMessage(data.message);
    }

    if (data.type === "MESSAGE") {
      this.onMessage(data);
    }
  }
}

export function createWebSocketClient(options = {}) {
  return new WebSocketClient(options);
}

function encodePublicKey(publicKey) {
  return Array.from(new Uint8Array(publicKey), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function decodePublicKey(hexPublicKey) {
  if (!/^(?:04[0-9a-fA-F]{128}|[0-9a-fA-F]{128})$/.test(hexPublicKey)) {
    throw new Error("Invitation contains an invalid public key.");
  }
  const normalized = hexPublicKey.length === 128 ? `04${hexPublicKey}` : hexPublicKey;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function parseInvitation(value) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error("Enter an invitation link or queue code.");
  }

  let invitationText = value.trim();
  if (/^https?:\/\//i.test(invitationText)) {
    try {
      invitationText = new URL(invitationText).hash.slice(1);
    } catch {
      throw new Error("The invitation URL is invalid.");
    }
  } else {
    invitationText = invitationText.replace(/^[#?]/, "");
  }

  const params = new URLSearchParams(invitationText);
  const queueId = params.get("queueId")?.trim();
  const pubKey = params.get("pubKey")?.trim();

  if (!queueId || !/^[A-Za-z0-9_-]{8,128}$/.test(queueId)) {
    throw new Error("The invitation queue ID is invalid or missing.");
  }
  if (
    !pubKey ||
    !/^(?:04[0-9a-fA-F]{128}|[0-9a-fA-F]{128})$/.test(pubKey)
  ) {
    throw new Error("The invitation public key is invalid or missing.");
  }

  return { queueId, pubKey };
}

export class CloakClient {
  constructor({
    url,
    pollInterval,
    onStatusChange,
    onError,
  } = {}) {
    this.onMessageCallback = () => {};
    this.onReceiptCallback = () => {};
    this.onStatusChange = onStatusChange || (() => {});
    this.onStatusCallback = () => {};
    this.onError = onError || (() => {});
    this.privateKey = null;
    this.publicKey = null;
    this.sharedKey = null;
    this.queueId = null;
    this.peerQueueId = null;
    this.localQueueId = null;
    this.activeQueueId = null;
    this.receiptStatuses = new Map();
    this.websocket = new WebSocketClient({
      url,
      pollInterval,
      onMessage: (message) => this.handleIncomingMessage(message),
      onStatusChange: (status) => {
        this.onStatusChange(status);
        this.onStatusCallback(status);
      },
      onError: (error) => this.onError(error),
    });
  }

  connect() {
    return this.websocket.connect();
  }

  disconnect() {
    this.websocket.disconnect();
  }

  async createInvitationLink() {
    await this.connect();
    this.websocket.stopAllPolling();
    this.sharedKey = null;
    this.peerQueueId = null;
    this.queueId = null;
    this.localQueueId = null;
    this.activeQueueId = null;
    this.privateKey = null;
    this.publicKey = null;
    this.receiptStatuses.clear();

    const keyPair = await generateEphemeralKeyPair({ extractable: true });
    const publicKey = encodePublicKey(
      await globalThis.crypto.subtle.exportKey("raw", keyPair.publicKey)
    );
    const { queueId } = await this.websocket.createQueue();

    this.privateKey = keyPair.privateKey;
    this.publicKey = publicKey;
    this.queueId = queueId;
    this.localQueueId = queueId;
    this.websocket.addPollingQueue(queueId);
    this.startPolling(this.websocket.pollInterval);

    const params = new URLSearchParams({ queueId, pubKey: publicKey });
    return `${window.location.origin}/#${params.toString()}`;
  }

  async acceptInvitation(queueId, hexPubKey) {
    const validatedInvitation = parseInvitation(
      `queueId=${encodeURIComponent(queueId || "")}&pubKey=${encodeURIComponent(hexPubKey || "")}`
    );
    queueId = validatedInvitation.queueId;
    hexPubKey = validatedInvitation.pubKey;

    await this.connect();
    this.websocket.stopAllPolling();
    this.sharedKey = null;
    this.peerQueueId = null;
    this.queueId = null;
    this.localQueueId = null;
    this.activeQueueId = null;
    this.privateKey = null;
    this.publicKey = null;
    this.receiptStatuses.clear();

    const keyPair = await generateEphemeralKeyPair({ extractable: true });
    const remotePublicKey = await globalThis.crypto.subtle.importKey(
      "raw",
      decodePublicKey(hexPubKey),
      { name: "ECDH", namedCurve: "P-256" },
      false,
      []
    );
    const sharedKey = await deriveSharedSecret(
      keyPair.privateKey,
      remotePublicKey
    );
    const { queueId: ownQueueId } = await this.websocket.createQueue();
    const ownPublicKey = encodePublicKey(
      await globalThis.crypto.subtle.exportKey("raw", keyPair.publicKey)
    );

    this.privateKey = keyPair.privateKey;
    this.publicKey = ownPublicKey;
    this.sharedKey = sharedKey;
    this.queueId = queueId;
    this.activeQueueId = queueId;
    this.peerQueueId = queueId;
    this.localQueueId = ownQueueId;

    await this.websocket.pushMessage({
      queueId,
      payload: JSON.stringify({
        type: "cloak-handshake",
        queueId: ownQueueId,
        publicKey: ownPublicKey,
      }),
    });
    this.websocket.addPollingQueue(ownQueueId);
  }

  startMessagePolling() {
    if (this.localQueueId) this.websocket.addPollingQueue(this.localQueueId);
  }

  startPolling(pollInterval = this.websocket.pollInterval) {
    this.websocket.startPolling(pollInterval);
    this.startMessagePolling();
  }

  async sendMessage(plaintext, burnAfterSec = 0) {
    if (!this.sharedKey || !this.activeQueueId) {
      throw new Error("The invitation session is not ready to send messages.");
    }
    if (![0, 5, 30, 60].includes(burnAfterSec)) {
      throw new Error("Burn timer must be off, 5, 30, or 60 seconds.");
    }

    const msgId = globalThis.crypto.randomUUID();
    const envelope = {
      envelopeType: "chat_message",
      type: "text",
      content: plaintext,
      burnAfterSec,
      msgId,
    };
    const response = await this.sendEnvelope(envelope);
    return {
      ...response,
      msgId,
      status: this.receiptStatuses.get(msgId) || "sent",
    };
  }

  async sendEnvelope(envelope) {
    if (!this.sharedKey || !this.activeQueueId) {
      throw new Error("The invitation session is not ready to send messages.");
    }

    const payload = await encryptPayload(
      this.sharedKey,
      JSON.stringify(envelope)
    );
    return this.websocket.pushMessage({
      queueId: this.activeQueueId,
      payload,
    });
  }

  async sendAck(msgId, status) {
    if (status !== "delivered" && status !== "seen") {
      throw new Error("Receipt status must be delivered or seen.");
    }
    if (typeof msgId !== "string" || !msgId) {
      throw new Error("A message ID is required for a receipt.");
    }

    return this.sendEnvelope({
      envelopeType: "receipt_ack",
      type: "ack",
      status,
      msgId,
    });
  }

  async handleIncomingMessage(message) {
    let payload = message;

    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        this.onError(new Error("Received an invalid message payload."));
        return;
      }
    }

    if (payload?.type === "cloak-handshake") {
      try {
        if (!this.privateKey) {
          throw new Error("Cannot accept a peer handshake before creating an invitation.");
        }

        const remotePublicKey = await globalThis.crypto.subtle.importKey(
          "raw",
          decodePublicKey(payload.publicKey),
          { name: "ECDH", namedCurve: "P-256" },
          false,
          []
        );
        this.sharedKey = await deriveSharedSecret(
          this.privateKey,
          remotePublicKey
        );
        this.activeQueueId = payload.queueId;
        this.peerQueueId = payload.queueId;
      } catch (error) {
        this.onError(error);
      }
      return;
    }

    if (!this.sharedKey) return;

    try {
      const encryptedPayload =
        payload && typeof payload === "object" && "payload" in payload
          ? payload.payload
          : message;
      const decrypted = await decryptPayload(this.sharedKey, encryptedPayload);
      let envelope;
      try {
        envelope = JSON.parse(decrypted);
      } catch {
        this.onMessageCallback({
          type: "text",
          content: decrypted,
          burnAfterSec: 0,
          msgId: null,
        });
        return;
      }

      if (
        envelope?.envelopeType === "receipt_ack" ||
        envelope?.type === "ack"
      ) {
        if (
          (envelope.status === "delivered" ||
            envelope.status === "seen") &&
          typeof envelope.msgId === "string"
        ) {
          const statusRank = { sent: 0, delivered: 1, seen: 2 };
          const currentStatus =
            this.receiptStatuses.get(envelope.msgId) || "sent";
          if (statusRank[envelope.status] > statusRank[currentStatus]) {
            this.receiptStatuses.set(envelope.msgId, envelope.status);
          }
          this.onReceiptCallback(
            envelope.msgId,
            this.receiptStatuses.get(envelope.msgId)
          );
        }
        return;
      }

      if (
        envelope?.envelopeType === "chat_message" &&
        envelope.type === "text" &&
        typeof envelope.content === "string" &&
        typeof envelope.msgId === "string"
      ) {
        const burnAfterSec = [0, 5, 30, 60].includes(envelope.burnAfterSec)
          ? envelope.burnAfterSec
          : 0;
        await this.sendAck(envelope.msgId, "delivered");
        this.onMessageCallback({
          type: "text",
          content: envelope.content,
          burnAfterSec,
          msgId: envelope.msgId,
        });
      }
    } catch (error) {
      this.onError(error);
    }
  }
}