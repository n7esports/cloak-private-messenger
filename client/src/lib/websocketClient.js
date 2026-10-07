import {
  decryptPayload,
  deriveSharedSecret,
  encryptPayload,
  generateEphemeralKeyPair,
} from "../../../crypto-engine/src/index.js";
import { supabase } from "./supabaseClient.js";

const CHANNEL_TIMEOUT_MS = 10000;
const ACK_STATUSES = new Set(["delivered", "seen"]);
const BURN_DURATIONS = new Set([0, 5, 30, 60]);

function encodePublicKey(publicKey) {
  return Array.from(new Uint8Array(publicKey), (byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

function decodePublicKey(hexPublicKey) {
  if (!/^(?:04[0-9a-fA-F]{128}|[0-9a-fA-F]{128})$/.test(hexPublicKey)) {
    throw new Error("Invitation contains an invalid public key.");
  }

  const normalized =
    hexPublicKey.length === 128 ? `04${hexPublicKey}` : hexPublicKey;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(
      normalized.slice(index * 2, index * 2 + 2),
      16
    );
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
  constructor({ onError } = {}) {
    this.channel = null;
    this.healthChannel = null;
    this.activeQueueId = null;
    this.localQueueId = null;
    this.peerQueueId = null;
    this.privateKey = null;
    this.publicKey = null;
    this.sharedKey = null;
    this.receiptStatuses = new Map();
    this.connectionPromise = null;
    this.onMessageCallback = () => {};
    this.onReceiptCallback = () => {};
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
      const healthChannel = supabase.channel(
        `cloak_client_${globalThis.crypto.randomUUID()}`,
        { config: { broadcast: { self: false } } }
      );
      this.healthChannel = healthChannel;

      try {
        await this.subscribe(healthChannel);
      } catch (error) {
        this.healthChannel = null;
        await supabase.removeChannel(healthChannel);
        throw error;
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
    this.privateKey = null;
    this.publicKey = null;
    this.sharedKey = null;
    this.receiptStatuses.clear();
    this.setStatus("disconnected");
  }

  async createInvitationLink() {
    await this.connect();
    this.leaveQueue();
    this.sharedKey = null;
    this.peerQueueId = null;
    this.activeQueueId = null;
    this.localQueueId = null;
    this.privateKey = null;
    this.publicKey = null;
    this.receiptStatuses.clear();

    const keyPair = await generateEphemeralKeyPair({ extractable: true });
    const publicKey = encodePublicKey(
      await globalThis.crypto.subtle.exportKey("raw", keyPair.publicKey)
    );
    const queueId = globalThis.crypto.randomUUID();

    this.privateKey = keyPair.privateKey;
    this.publicKey = publicKey;
    this.localQueueId = queueId;
    this.activeQueueId = queueId;

    await this.joinQueue(queueId);

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
    this.leaveQueue();
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
    const ownPublicKey = encodePublicKey(
      await globalThis.crypto.subtle.exportKey("raw", keyPair.publicKey)
    );

    this.privateKey = keyPair.privateKey;
    this.publicKey = ownPublicKey;
    this.sharedKey = sharedKey;
    this.activeQueueId = queueId;
    this.localQueueId = queueId;
    this.peerQueueId = queueId;

    await this.joinQueue(queueId);
    await this.sendBroadcast(
      this.channel,
      JSON.stringify({
        type: "cloak-handshake",
        publicKey: ownPublicKey,
      })
    );
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
      throw new Error("The invitation session is not ready to send messages.");
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
      throw new Error("The invitation session is not ready to send messages.");
    }

    const encryptedMessage = await encryptPayload(
      this.sharedKey,
      JSON.stringify(envelope)
    );
    return this.sendBroadcast(this.channel, encryptedMessage);
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

    if (envelope?.type === "cloak-handshake") {
      try {
        if (!this.privateKey || typeof envelope.publicKey !== "string") {
          throw new Error("Received an invalid invitation handshake.");
        }
        const remotePublicKey = await globalThis.crypto.subtle.importKey(
          "raw",
          decodePublicKey(envelope.publicKey),
          { name: "ECDH", namedCurve: "P-256" },
          false,
          []
        );
        this.sharedKey = await deriveSharedSecret(
          this.privateKey,
          remotePublicKey
        );
      } catch (error) {
        this.onError(error);
      }
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
