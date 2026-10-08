import {
  decryptVaultPayload,
  encryptVaultPayload,
  initCrypto,
  type IdentityKeys,
} from "./crypto";
import {
  buildEnvelope,
  decodeBytes,
  encodeBytes,
  EPHEMERAL_TIMERS,
  signEnvelope,
  type Envelope,
  type InnerPayload,
  type SignedEnvelope,
} from "./protocol";
import { database } from "./vault";

export interface ChannelSubscriber {
  encryptionPublicKey: Uint8Array;
}

export interface ChannelBroadcast {
  recipientPubKey: string;
  packet: SignedEnvelope;
}

interface StoredGroupKey {
  channelId: string;
  rosterFingerprint: string;
  groupKey: number[];
}

function isByteArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.every(
      (byte) =>
        typeof byte === "number" &&
        Number.isInteger(byte) &&
        byte >= 0 &&
        byte <= 255,
    )
  );
}

async function loadGroupKey(
  channelId: string,
  vaultKey: Uint8Array,
): Promise<StoredGroupKey | null> {
  const record = await database.sessions.get(`channel:${channelId}`);
  if (!record) return null;
  const plaintext = await decryptVaultPayload(
    record.ciphertext,
    record.nonce,
    vaultKey,
  );
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(plaintext));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("channelId" in parsed) ||
      parsed.channelId !== channelId ||
      !("rosterFingerprint" in parsed) ||
      typeof parsed.rosterFingerprint !== "string" ||
      !("groupKey" in parsed) ||
      !isByteArray(parsed.groupKey)
    ) {
      throw new Error("Stored private channel key is invalid.");
    }
    return {
      channelId,
      rosterFingerprint: parsed.rosterFingerprint,
      groupKey: parsed.groupKey,
    };
  } finally {
    plaintext.fill(0);
  }
}

export async function rotatePrivateChannelKey(
  channelId: string,
  subscribers: ChannelSubscriber[],
  identity: IdentityKeys,
  vaultKey: Uint8Array,
): Promise<{
  groupKey: Uint8Array;
  keyRotationEnvelopes: ChannelBroadcast[];
}> {
  if (!channelId.trim()) throw new Error("A channel ID is required.");
  const sodium = await initCrypto();
  const roster = [
    ...new Set(subscribers.map((entry) => encodeBytes(entry.encryptionPublicKey))),
  ].sort();
  if (roster.length !== subscribers.length) {
    throw new Error("Channel subscribers must have unique public keys.");
  }
  if (
    subscribers.some(
      (subscriber) =>
        subscriber.encryptionPublicKey.length !==
        sodium.crypto_box_PUBLICKEYBYTES,
    )
  ) {
    throw new Error("A channel subscriber has an invalid encryption key.");
  }

  const groupKey = sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
  const rosterFingerprint = encodeBytes(
    sodium.crypto_generichash(32, sodium.from_string(roster.join(".")), null),
  );
  const serialized: StoredGroupKey = {
    channelId,
    rosterFingerprint,
    groupKey: Array.from(groupKey),
  };
  const keyRotationEnvelopes: ChannelBroadcast[] = [];
  try {
    for (const subscriber of subscribers) {
      const envelope = await buildEnvelope(
        {
          type: "system",
          content: JSON.stringify({
            type: "channel-key-rotation",
            channelId,
            rosterFingerprint,
            groupKey: encodeBytes(groupKey),
          }),
        },
        subscriber.encryptionPublicKey,
      );
      const packet = await signEnvelope(envelope, identity, crypto.randomUUID());
      keyRotationEnvelopes.push({
        recipientPubKey: encodeBytes(subscriber.encryptionPublicKey),
        packet,
      });
    }

    const plaintext = sodium.from_string(JSON.stringify(serialized));
    try {
      const encrypted = await encryptVaultPayload(plaintext, vaultKey);
      await database.sessions.put({
        id: `channel:${channelId}`,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        updatedAt: Date.now(),
      });
    } finally {
      plaintext.fill(0);
    }
  } catch (error) {
    groupKey.fill(0);
    throw error;
  }
  return { groupKey, keyRotationEnvelopes };
}

export async function acceptPrivateChannelKeyRotation(
  content: string,
  vaultKey: Uint8Array,
): Promise<{ channelId: string; rosterFingerprint: string }> {
  const parsed: unknown = JSON.parse(content);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("type" in parsed) ||
    parsed.type !== "channel-key-rotation" ||
    !("channelId" in parsed) ||
    typeof parsed.channelId !== "string" ||
    !("rosterFingerprint" in parsed) ||
    typeof parsed.rosterFingerprint !== "string" ||
    !("groupKey" in parsed) ||
    typeof parsed.groupKey !== "string"
  ) {
    throw new Error("Private channel key rotation payload is invalid.");
  }
  const groupKey = decodeBytes(parsed.groupKey);
  const sodium = await initCrypto();
  if (groupKey.length !== sodium.crypto_secretbox_KEYBYTES) {
    groupKey.fill(0);
    throw new Error("Private channel group key has an invalid length.");
  }

  const previous = await loadGroupKey(parsed.channelId, vaultKey);
  previous?.groupKey.fill(0);
  const plaintext = sodium.from_string(
    JSON.stringify({
      channelId: parsed.channelId,
      rosterFingerprint: parsed.rosterFingerprint,
      groupKey: Array.from(groupKey),
    } satisfies StoredGroupKey),
  );
  try {
    const encrypted = await encryptVaultPayload(plaintext, vaultKey);
    await database.sessions.put({
      id: `channel:${parsed.channelId}`,
      ciphertext: encrypted.ciphertext,
      nonce: encrypted.nonce,
      updatedAt: Date.now(),
    });
  } finally {
    plaintext.fill(0);
    groupKey.fill(0);
  }
  return {
    channelId: parsed.channelId,
    rosterFingerprint: parsed.rosterFingerprint,
  };
}

export async function broadcastChannelMessage(
  channelId: string,
  kind: "public" | "private",
  payload: InnerPayload,
  subscribers: ChannelSubscriber[],
  identity: IdentityKeys,
  vaultKey: Uint8Array,
): Promise<ChannelBroadcast[]> {
  const sodium = await initCrypto();
  let content = payload.content;
  if (kind === "private") {
    const stored = await loadGroupKey(channelId, vaultKey);
    if (!stored) throw new Error("Private channel key has not been initialized.");
    const currentRoster = [
      ...new Set(subscribers.map((entry) => encodeBytes(entry.encryptionPublicKey))),
    ].sort();
    const currentFingerprint = encodeBytes(
      sodium.crypto_generichash(
        32,
        sodium.from_string(currentRoster.join(".")),
        null,
      ),
    );
    if (currentFingerprint !== stored.rosterFingerprint) {
      stored.groupKey.fill(0);
      throw new Error("Private channel subscribers changed; rotate its group key.");
    }

    const groupKey = Uint8Array.from(stored.groupKey);
    stored.groupKey.fill(0);
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const plaintext = sodium.from_string(JSON.stringify(payload));
    try {
      const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, groupKey);
      content = JSON.stringify({
        type: "private-channel-payload",
        nonce: encodeBytes(nonce),
        ciphertext: encodeBytes(ciphertext),
        timestamp: Date.now(),
      });
    } finally {
      plaintext.fill(0);
      groupKey.fill(0);
    }
  }

  const output: ChannelBroadcast[] = [];
  for (const subscriber of subscribers) {
    const envelope: Envelope = await buildEnvelope(
      { type: payload.type, content },
      subscriber.encryptionPublicKey,
    );
    output.push({
      recipientPubKey: encodeBytes(subscriber.encryptionPublicKey),
      packet: await signEnvelope(envelope, identity, crypto.randomUUID()),
    });
  }
  return output;
}

export async function openPrivateChannelPayload(
  channelId: string,
  encryptedPayload: string,
  vaultKey: Uint8Array,
): Promise<InnerPayload> {
  const stored = await loadGroupKey(channelId, vaultKey);
  if (!stored) throw new Error("Private channel key has not been initialized.");
  const sodium = await initCrypto();
  const parsed: unknown = JSON.parse(encryptedPayload);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("nonce" in parsed) ||
    typeof parsed.nonce !== "string" ||
    !("ciphertext" in parsed) ||
    typeof parsed.ciphertext !== "string"
  ) {
    throw new Error("Private channel payload is invalid.");
  }
  const groupKey = Uint8Array.from(stored.groupKey);
  try {
    const plaintext = sodium.crypto_secretbox_open_easy(
      decodeBytes(parsed.ciphertext),
      decodeBytes(parsed.nonce),
      groupKey,
    );
    try {
      const payload: unknown = JSON.parse(new TextDecoder().decode(plaintext));
      if (
        typeof payload !== "object" ||
        payload === null ||
        !("type" in payload) ||
        !["text", "image", "file", "system"].includes(String(payload.type)) ||
        !("content" in payload) ||
        typeof payload.content !== "string" ||
        ("ephemeralTimer" in payload &&
          payload.ephemeralTimer !== undefined &&
          (typeof payload.ephemeralTimer !== "number" ||
            !EPHEMERAL_TIMERS.some(
              (timer) => timer === payload.ephemeralTimer,
            )))
      ) {
        throw new Error("Decrypted private channel payload is invalid.");
      }
      const type = payload.type;
      if (
        type !== "text" &&
        type !== "image" &&
        type !== "file" &&
        type !== "system"
      ) {
        throw new Error("Decrypted private channel payload is invalid.");
      }
      const result: InnerPayload = { type, content: payload.content };
      if (
        "ephemeralTimer" in payload &&
        typeof payload.ephemeralTimer === "number"
      ) {
        result.ephemeralTimer = payload.ephemeralTimer;
      }
      return result;
    } finally {
      plaintext.fill(0);
    }
  } finally {
    groupKey.fill(0);
    stored.groupKey.fill(0);
  }
}
