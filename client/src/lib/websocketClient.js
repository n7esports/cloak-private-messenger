import {
  decryptPayload,
  encryptPayload,
} from "../../../crypto-engine/src/index.js";
import { supabase } from "./supabaseClient.js";

const CHANNEL_TIMEOUT_MS = 10000;
const MAX_CONNECTION_ATTEMPTS = 3;
const ACK_STATUSES = new Set(["delivered", "seen"]);
const BURN_DURATIONS = new Set([0, 5, 30, 60]);

export class CloakClient {
  constructor({ onError } = {}) {
    this.channel = null;
    this.healthChannel = null;
    this.activeQueueId = null;
    this.localQueueId = null;
    this.peerQueueId = null;
    this.sharedKey = null;
    this.roomKeyHex = null;
    this.receiptStatuses = new Map();
    this.connectionPromise = null;
    this.onMessageCallback = () => {};
    this.onReceiptCallback = () => {};
    this.onTypingCallback = () => {};
    this.onStatusCallback = () => {};
    this.onError = onError || (() => {});
  }

  setStatus(status) {
    this.onStatusCallback(status);
  }

  async subscribe(channel) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const timeout = setTimeout(() => {
        settled = true;
        reject(new Error("Timed out while subscribing to the Supabase channel."));
      }, CHANNEL_TIMEOUT_MS);

      channel.subscribe((status, error) => {
        if (status === "SUBSCRIBED") {
          this.setStatus("connected");
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            resolve();
          }
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          const subscriptionError =
            error instanceof Error
              ? error
              : new Error(`Supabase channel subscription failed: ${status}.`);
          if (
            channel === this.channel ||
            channel === this.healthChannel
          ) {
            this.setStatus("disconnected");
          }
          if (!settled) {
            settled = true;
            clearTimeout(timeout);
            reject(subscriptionError);
          } else if (status !== "CLOSED") {
            this.onError(subscriptionError);
          }
        }
      });
    });
  }

  async sendBroadcast(channel, message) {
    const result = await channel.send({
      type: "broadcast",
      event: "encrypted_payload",
      payload: { message },
    });
    if (result?.status === "error") {
      throw new Error(result.message || "Supabase broadcast failed.");
    }
    return result;
  }

  async connect() {
    if (this.healthChannel) return;
    if (this.connectionPromise) return this.connectionPromise;

    this.setStatus("connecting");
    this.connectionPromise = (async () => {
      try {
        let lastError;
        for (let attempt = 0; attempt < MAX_CONNECTION_ATTEMPTS; attempt += 1) {
          const healthChannel = supabase.channel(
            `cloak_client_${globalThis.crypto.randomUUID()}`,
            { config: { broadcast: { self: false } } }
          );
          this.healthChannel = healthChannel;

          try {
            await this.subscribe(healthChannel);
            return;
          } catch (error) {
            lastError = error;
            if (this.healthChannel === healthChannel) {
              this.healthChannel = null;
            }
            await supabase.removeChannel(healthChannel);
            if (attempt < MAX_CONNECTION_ATTEMPTS - 1) {
              await new Promise((resolve) =>
                setTimeout(resolve, 500 * 2 ** attempt)
              );
            }
          }
        }
        throw lastError;
      } finally {
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  init() {
    return this.connect();
  }

  disconnect() {
    this.leaveQueue();
    if (this.healthChannel) {
      const channel = this.healthChannel;
      this.healthChannel = null;
      supabase.removeChannel(channel).catch((error) => this.onError(error));
    }
    this.sharedKey = null;
    this.roomKeyHex = null;
    this.activeQueueId = null;
    this.localQueueId = null;
    this.peerQueueId = null;
    this.receiptStatuses.clear();
    this.setStatus("disconnected");
  }

  async joinWithKey(hexKey) {
    if (typeof hexKey !== "string" || !/^[0-9a-fA-F]{64}$/.test(hexKey)) {
      throw new Error("Enter a valid 64-character hexadecimal key.");
    }
    const normalizedKey = hexKey.toLowerCase();
    const keyBytes = new Uint8Array(
      normalizedKey.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16))
    );
    try {
      const roomDigest = await globalThis.crypto.subtle.digest(
        "SHA-256",
        keyBytes
      );
      const roomId = Array.from(new Uint8Array(roomDigest), (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join("");
      await this.connect();
      this.leaveQueue();
      this.receiptStatuses.clear();
      this.sharedKey = await globalThis.crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
      this.roomKeyHex = normalizedKey;
      this.activeQueueId = roomId;
      this.localQueueId = roomId;
      this.peerQueueId = roomId;
      await this.joinQueue(roomId);
    } finally {
      keyBytes.fill(0);
    }
  }

  async joinQueue(queueId) {
    if (this.channel) this.leaveQueue();

    const channel = supabase.channel(`queue_${queueId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on(
      "broadcast",
      { event: "encrypted_payload" },
      (broadcast) => {
        const message = broadcast.payload?.message;
        if (typeof message === "string") {
          this.handleIncomingMessage(message).catch((error) =>
            this.onError(error)
          );
        }
      }
    );
    channel.on("broadcast", { event: "client_typing" }, () => {
      this.onTypingCallback(true);
    });
    channel.on("broadcast", { event: "client_stopped_typing" }, () => {
      this.onTypingCallback(false);
    });

    this.channel = channel;
    try {
      await this.subscribe(channel);
    } catch (error) {
      if (this.channel === channel) this.channel = null;
      await supabase.removeChannel(channel);
      throw error;
    }
  }

  startPolling() {
    // Supabase Realtime delivers messages through the subscribed broadcast channel.
  }

  leaveQueue() {
    if (!this.channel) return;
    const channel = this.channel;
    this.channel = null;
    supabase.removeChannel(channel).catch((error) => this.onError(error));
  }

  async sendMessage(plaintext, burnAfterSec = 0) {
    if (!this.sharedKey || !this.activeQueueId) {
      throw new Error("The key-based session is not ready to send messages.");
    }
    if (!BURN_DURATIONS.has(burnAfterSec)) {
      throw new Error("Burn timer must be off, 5, 30, or 60 seconds.");
    }

    const msgId = globalThis.crypto.randomUUID();
    const response = await this.sendEnvelope({
      envelopeType: "chat_message",
      type: "text",
      content: plaintext,
      burnAfterSec,
      msgId,
    });

    return {
      ...response,
      msgId,
      status: this.receiptStatuses.get(msgId) || "sent",
    };
  }

  async sendEnvelope(envelope) {
    if (!this.sharedKey || !this.channel) {
      throw new Error("The key-based session is not ready to send messages.");
    }
    const encryptedMessage = await encryptPayload(
      this.sharedKey,
      JSON.stringify(envelope)
    );
    return this.sendBroadcast(this.channel, encryptedMessage);
  }

  async sendTyping(isTyping) {
    if (!this.channel || typeof isTyping !== "boolean") {
      throw new Error("A connected room and typing state are required.");
    }
    const result = await this.channel.send({
      type: "broadcast",
      event: isTyping ? "client_typing" : "client_stopped_typing",
      payload: {},
    });
    if (result?.status === "error") {
      throw new Error(result.message || "Could not broadcast typing state.");
    }
    return result;
  }

  async sendAck(msgId, status) {
    if (!ACK_STATUSES.has(status)) {
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
    let envelope;
    try {
      envelope = JSON.parse(message);
    } catch {
      this.onError(new Error("Received an invalid channel message."));
      return;
    }

    if (!this.sharedKey) return;

    try {
      const decrypted = await decryptPayload(this.sharedKey, message);
      const payload = JSON.parse(decrypted);

      if (
        payload?.envelopeType === "receipt_ack" ||
        payload?.type === "ack"
      ) {
        if (
          ACK_STATUSES.has(payload.status) &&
          typeof payload.msgId === "string"
        ) {
          const statusRank = { sent: 0, delivered: 1, seen: 2 };
          const currentStatus = this.receiptStatuses.get(payload.msgId) || "sent";
          if (statusRank[payload.status] > statusRank[currentStatus]) {
            this.receiptStatuses.set(payload.msgId, payload.status);
          }
          this.onReceiptCallback(
            payload.msgId,
            this.receiptStatuses.get(payload.msgId)
          );
        }
        return;
      }

      if (
        payload?.envelopeType === "chat_message" &&
        payload.type === "text" &&
        typeof payload.content === "string" &&
        typeof payload.msgId === "string"
      ) {
        const burnAfterSec = BURN_DURATIONS.has(payload.burnAfterSec)
          ? payload.burnAfterSec
          : 0;
        await this.sendAck(payload.msgId, "delivered");
        this.onMessageCallback({
          type: "text",
          content: payload.content,
          burnAfterSec,
          msgId: payload.msgId,
        });
      }
    } catch (error) {
      this.onError(error);
    }
  }
}
