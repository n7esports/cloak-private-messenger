import {
  initCrypto,
  type IdentityKeys,
} from "./crypto";

export type PayloadType = "text" | "image" | "file" | "system";

export interface InnerPayload {
  type: PayloadType;
  content: string;
  ephemeralTimer?: number;
}

export interface Envelope {
  recipientPubKey: string;
  ephemeralPubKey: string;
  nonce: string;
  ciphertext: string;
  timestamp: number;
}

export interface SignedEnvelope {
  type: "message";
  id: string;
  senderPubKey: string;
  senderEncryptionPubKey: string;
  signature: string;
  envelope: Envelope;
}

export type RatchetDirection = "send" | "receive";

export interface RatchetSession {
  remotePubKey: string;
  sendChainKey: Uint8Array;
  receiveChainKey: Uint8Array;
  sendCounter: number;
  receiveCounter: number;
}

export const EPHEMERAL_TIMERS = [
  5_000,
  60_000,
  3_600_000,
  86_400_000,
  604_800_000,
] as const;

export function isEphemeralExpired(
  timestamp: number,
  ephemeralTimer: number | undefined,
  now = Date.now(),
): boolean {
  return (
    ephemeralTimer !== undefined &&
    Number.isSafeInteger(timestamp) &&
    Number.isSafeInteger(now) &&
    EPHEMERAL_TIMERS.some((timer) => timer === ephemeralTimer) &&
    timestamp + ephemeralTimer <= now
  );
}

export function getExpiredMessageIds(
  messages: Array<{
    id: string;
    timestamp: number;
    ephemeralTimer?: number;
  }>,
  now = Date.now(),
): string[] {
  return messages
    .filter((message) =>
      isEphemeralExpired(message.timestamp, message.ephemeralTimer, now),
    )
    .map((message) => message.id);
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder("utf-8", { fatal: true });

export function encodeBytes(bytes: Uint8Array): string {
  return bytesToBase64(bytes);
}

export function decodeBytes(encoded: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
    throw new Error("Invalid base64-encoded cryptographic data.");
  }
  const binary = atob(encoded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function joinBytes(...parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function isValidPayload(payload: InnerPayload): boolean {
  return (
    ["text", "image", "file", "system"].includes(payload.type) &&
    typeof payload.content === "string" &&
    payload.content.length <= 10_000_000 &&
    (payload.ephemeralTimer === undefined ||
      EPHEMERAL_TIMERS.includes(
        payload.ephemeralTimer as (typeof EPHEMERAL_TIMERS)[number],
      ))
  );
}

export async function buildEnvelope(
  payload: InnerPayload,
  recipientPublicKey: Uint8Array,
  sessionKey?: Uint8Array,
  timestamp = Date.now(),
): Promise<Envelope> {
  const sodium = await initCrypto();
  if (!isValidPayload(payload)) {
    throw new Error("Invalid message payload or ephemeral timer.");
  }
  if (recipientPublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
    throw new Error("Recipient encryption key has an invalid length.");
  }
  if (!Number.isSafeInteger(timestamp) || timestamp < 0) {
    throw new Error("Message timestamp must be a non-negative integer.");
  }

  const contentKey =
    sessionKey?.slice() ??
    sodium.randombytes_buf(sodium.crypto_secretbox_KEYBYTES);
  if (contentKey.length !== sodium.crypto_secretbox_KEYBYTES) {
    throw new Error("Session key has an invalid length.");
  }

  let plaintext: Uint8Array | undefined;
  try {
    const sealedKey = sodium.crypto_box_seal(contentKey, recipientPublicKey);
    const ephemeralPubKey = sealedKey.slice(
      0,
      sodium.crypto_box_PUBLICKEYBYTES,
    );
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    plaintext = textEncoder.encode(JSON.stringify(payload));
    const contentCiphertext = sodium.crypto_secretbox_easy(
      plaintext,
      nonce,
      contentKey,
    );
    const ciphertext = joinBytes(
      sealedKey.slice(sodium.crypto_box_PUBLICKEYBYTES),
      contentCiphertext,
    );
    return {
      recipientPubKey: encodeBytes(recipientPublicKey),
      ephemeralPubKey: encodeBytes(ephemeralPubKey),
      nonce: encodeBytes(nonce),
      ciphertext: encodeBytes(ciphertext),
      timestamp,
    };
  } finally {
    contentKey.fill(0);
    plaintext?.fill(0);
  }
}

export async function openEnvelope(
  envelope: Envelope,
  recipientIdentity: Pick<IdentityKeys, "encryptionPublicKey" | "encryptionPrivateKey">,
  expectedSessionKey?: Uint8Array,
): Promise<InnerPayload> {
  const sodium = await initCrypto();
  const recipientPublicKey = decodeBytes(envelope.recipientPubKey);
  const ephemeralPubKey = decodeBytes(envelope.ephemeralPubKey);
  const nonce = decodeBytes(envelope.nonce);
  const ciphertext = decodeBytes(envelope.ciphertext);

  if (
    recipientPublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES ||
    ephemeralPubKey.length !== sodium.crypto_box_PUBLICKEYBYTES ||
    recipientIdentity.encryptionPrivateKey.length !==
      sodium.crypto_box_SECRETKEYBYTES ||
    nonce.length !== sodium.crypto_secretbox_NONCEBYTES ||
    ciphertext.length <
      sodium.crypto_secretbox_KEYBYTES +
        sodium.crypto_box_SEALBYTES -
        sodium.crypto_box_PUBLICKEYBYTES +
        sodium.crypto_secretbox_MACBYTES
  ) {
    throw new Error("Encrypted envelope has invalid cryptographic fields.");
  }
  if (
    !sodium.memcmp(recipientPublicKey, recipientIdentity.encryptionPublicKey)
  ) {
    throw new Error("Envelope is addressed to a different recipient.");
  }

  const sealedKey = joinBytes(
    ephemeralPubKey,
    ciphertext.slice(
      0,
      sodium.crypto_secretbox_KEYBYTES +
        sodium.crypto_box_SEALBYTES -
        sodium.crypto_box_PUBLICKEYBYTES,
    ),
  );
  const contentKey = sodium.crypto_box_seal_open(
    sealedKey,
    recipientIdentity.encryptionPublicKey,
    recipientIdentity.encryptionPrivateKey,
  );
  if (contentKey.length !== sodium.crypto_secretbox_KEYBYTES) {
    contentKey.fill(0);
    throw new Error("Envelope contains an invalid session key.");
  }
  if (
    expectedSessionKey &&
    (expectedSessionKey.length !== contentKey.length ||
      !sodium.memcmp(contentKey, expectedSessionKey))
  ) {
    contentKey.fill(0);
    throw new Error("Envelope session key does not match the contact ratchet.");
  }

  let plaintext: Uint8Array | undefined;
  try {
    plaintext = sodium.crypto_secretbox_open_easy(
      ciphertext.slice(
        sodium.crypto_secretbox_KEYBYTES +
          sodium.crypto_box_SEALBYTES -
          sodium.crypto_box_PUBLICKEYBYTES,
      ),
      nonce,
      contentKey,
    );
    const parsed: unknown = JSON.parse(textDecoder.decode(plaintext));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("type" in parsed) ||
      !("content" in parsed) ||
      (parsed.type !== "text" &&
        parsed.type !== "image" &&
        parsed.type !== "file" &&
        parsed.type !== "system") ||
      typeof parsed.content !== "string" ||
      ("ephemeralTimer" in parsed &&
        parsed.ephemeralTimer !== undefined &&
        (typeof parsed.ephemeralTimer !== "number" ||
          !EPHEMERAL_TIMERS.includes(
            parsed.ephemeralTimer as (typeof EPHEMERAL_TIMERS)[number],
          )))
    ) {
      throw new Error("Envelope contains an invalid message payload.");
    }
    const payload: InnerPayload = {
      type: parsed.type,
      content: parsed.content,
    };
    if ("ephemeralTimer" in parsed && typeof parsed.ephemeralTimer === "number") {
      payload.ephemeralTimer = parsed.ephemeralTimer;
    }
    return payload;
  } finally {
    contentKey.fill(0);
    plaintext?.fill(0);
  }
}

export async function createRatchetSession(
  localPublicKey: Uint8Array,
  localPrivateKey: Uint8Array,
  remotePublicKey: Uint8Array,
): Promise<RatchetSession> {
  const sodium = await initCrypto();
  if (
    localPublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES ||
    remotePublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES ||
    localPrivateKey.length !== sodium.crypto_box_SECRETKEYBYTES
  ) {
    throw new Error("Contact session key material has an invalid length.");
  }

  const shared = sodium.crypto_box_beforenm(remotePublicKey, localPrivateKey);
  const localIsFirst =
    encodeBytes(localPublicKey) < encodeBytes(remotePublicKey);
  const firstPublicKey = localIsFirst ? localPublicKey : remotePublicKey;
  const secondPublicKey = localIsFirst ? remotePublicKey : localPublicKey;
  const root = sodium.crypto_generichash(
    64,
    joinBytes(
      textEncoder.encode("cloak-session-v1"),
      firstPublicKey,
      secondPublicKey,
    ),
    shared,
  );
  const firstToSecond = sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    textEncoder.encode("cloak-chain-first-to-second"),
    root,
  );
  const secondToFirst = sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    textEncoder.encode("cloak-chain-second-to-first"),
    root,
  );
  shared.fill(0);
  root.fill(0);

  return {
    remotePubKey: encodeBytes(remotePublicKey),
    sendChainKey: localIsFirst ? firstToSecond : secondToFirst,
    receiveChainKey: localIsFirst ? secondToFirst : firstToSecond,
    sendCounter: 0,
    receiveCounter: 0,
  };
}

export async function rotateSessionKey(
  session: RatchetSession,
  direction: RatchetDirection,
): Promise<{ messageKey: Uint8Array; session: RatchetSession }> {
  const sodium = await initCrypto();
  const chainKey =
    direction === "send" ? session.sendChainKey : session.receiveChainKey;
  const counter =
    direction === "send" ? session.sendCounter : session.receiveCounter;
  const encodedCounter = new Uint8Array(8);
  new DataView(encodedCounter.buffer).setBigUint64(0, BigInt(counter), false);
  const messageKey = sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    joinBytes(textEncoder.encode("cloak-message-key-v1"), encodedCounter),
    chainKey,
  );
  const nextChainKey = sodium.crypto_generichash(
    sodium.crypto_secretbox_KEYBYTES,
    joinBytes(textEncoder.encode("cloak-chain-step-v1"), encodedCounter),
    chainKey,
  );
  chainKey.fill(0);

  return {
    messageKey,
    session: {
      ...session,
      ...(direction === "send"
        ? { sendChainKey: nextChainKey, sendCounter: counter + 1 }
        : { receiveChainKey: nextChainKey, receiveCounter: counter + 1 }),
    },
  };
}

export async function signEnvelope(
  envelope: Envelope,
  identity: IdentityKeys,
  id: string,
): Promise<SignedEnvelope> {
  const sodium = await initCrypto();
  const senderEncryptionPubKey = encodeBytes(identity.encryptionPublicKey);
  const canonical = textEncoder.encode(
    JSON.stringify({ id, envelope, senderEncryptionPubKey }),
  );
  const signature = sodium.crypto_sign_detached(
    canonical,
    identity.signingPrivateKey,
  );
  return {
    type: "message",
    id,
    senderPubKey: encodeBytes(identity.signingPublicKey),
    senderEncryptionPubKey,
    signature: encodeBytes(signature),
    envelope,
  };
}

export async function verifySignedEnvelope(
  packet: SignedEnvelope,
): Promise<boolean> {
  const sodium = await initCrypto();
  try {
    const senderPublicKey = decodeBytes(packet.senderPubKey);
    const signature = decodeBytes(packet.signature);
    if (
      senderPublicKey.length !== sodium.crypto_sign_PUBLICKEYBYTES ||
      signature.length !== sodium.crypto_sign_BYTES ||
      !packet.id
    ) {
      return false;
    }
    return sodium.crypto_sign_verify_detached(
      signature,
      textEncoder.encode(
        JSON.stringify({
          id: packet.id,
          envelope: packet.envelope,
          senderEncryptionPubKey: packet.senderEncryptionPubKey,
        }),
      ),
      senderPublicKey,
    );
  } catch {
    return false;
  }
}
