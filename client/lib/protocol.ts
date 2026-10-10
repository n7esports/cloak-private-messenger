import {
  initCrypto,
  type IdentityKeys,
} from "./crypto";

export type PayloadType = "text" | "image" | "file" | "system";

/**
 * Attachments travel inside the same end-to-end encrypted envelope as the
 * message body: the bytes are read on-device, base64-encoded and sealed by the
 * conversation ratchet. The relay only ever sees ciphertext — there is no
 * plaintext upload server. The size cap keeps the sealed payload inside the
 * relay's per-message broadcast limit.
 */
export interface MessageAttachment {
  name: string;
  mime: string;
  size: number;
  data: string;
}

export interface InnerPayload {
  type: PayloadType;
  content: string;
  ephemeralTimer?: number;
  attachment?: MessageAttachment;
  replyTo?: { id: string; alias: string; excerpt: string };
}

const REPLY_REF_MAX_EXCERPT = 200;

export function isValidReplyRef(
  value: unknown,
): value is { id: string; alias: string; excerpt: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    value.id.length > 0 &&
    value.id.length <= 100 &&
    "alias" in value &&
    typeof value.alias === "string" &&
    value.alias.length <= 200 &&
    "excerpt" in value &&
    typeof value.excerpt === "string" &&
    value.excerpt.length <= REPLY_REF_MAX_EXCERPT
  );
}

export const MAX_ATTACHMENT_BYTES = 700 * 1024;

const ATTACHMENT_DATA_URL = /^data:[a-z0-9.+-]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/]+={0,2}$/i;

// Explicit allowlist of image subtypes that are safe to render inline via
// <img src>. The general data-URL validation still applies to every
// attachment (including the non-inline download path); this only gates the
// inline-render decision in the UI.
const INLINE_IMAGE_MIME_RE = /^image\/(png|jpe?g|gif|webp|avif)$/i;

export function isInlineRenderableImage(mime: string): boolean {
  return INLINE_IMAGE_MIME_RE.test(mime);
}

export function isValidAttachment(value: unknown): value is MessageAttachment {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    value.name.length <= 200 &&
    "mime" in value &&
    typeof value.mime === "string" &&
    value.mime.length > 0 &&
    value.mime.length <= 120 &&
    "size" in value &&
    typeof value.size === "number" &&
    Number.isSafeInteger(value.size) &&
    value.size >= 0 &&
    value.size <= MAX_ATTACHMENT_BYTES &&
    "data" in value &&
    typeof value.data === "string" &&
    ATTACHMENT_DATA_URL.test(value.data)
  );
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Human-readable body line stored/shown for an attachment message. */
export function describeAttachment(attachment: MessageAttachment): string {
  const label = attachment.mime.startsWith("image/")
    ? "Photo"
    : attachment.mime.startsWith("video/")
      ? "Video"
      : attachment.mime.startsWith("audio/")
        ? "Audio"
        : "File";
  return `${label}: ${attachment.name} (${formatFileSize(attachment.size)})`;
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

/**
 * Decodes decrypted bytes as UTF-8. A fatal decode here means the sender's
 * payload was not valid UTF-8 — surface that specifically instead of letting
 * it masquerade as a generic envelope-processing failure.
 */
function decodeUtf8(bytes: Uint8Array): string {
  try {
    return textDecoder.decode(bytes);
  } catch {
    throw new Error("Envelope payload is not valid UTF-8");
  }
}

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
      )) &&
    (payload.attachment === undefined || isValidAttachment(payload.attachment)) &&
    (payload.replyTo === undefined || isValidReplyRef(payload.replyTo))
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
    const parsed: unknown = JSON.parse(decodeUtf8(plaintext));
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
    if ("attachment" in parsed && parsed.attachment !== undefined) {
      if (!isValidAttachment(parsed.attachment)) {
        throw new Error("Envelope contains an invalid attachment.");
      }
      payload.attachment = parsed.attachment;
    }
    if ("replyTo" in parsed && parsed.replyTo !== undefined) {
      if (!isValidReplyRef(parsed.replyTo)) {
        throw new Error("Envelope contains an invalid reply reference.");
      }
      payload.replyTo = parsed.replyTo;
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

/**
 * A typing indicator is a fire-and-forget control signal. It is deliberately
 * kept OUT of the message ratchet so a dropped signal can never desync the
 * conversation chain. It is still end-to-end protected: the state is sealed to
 * the recipient with an anonymous `crypto_box_seal` (so the relay only sees
 * ciphertext) and the whole packet is signed by the sender's Ed25519 identity
 * (so the recipient can authenticate who is typing).
 */
export type TypingState = "typing" | "stop";
export interface TypingSignal {
  type: "typing";
  id: string;
  senderPubKey: string;
  senderEncryptionPubKey: string;
  recipientPubKey: string;
  sealed: string;
  timestamp: number;
  signature: string;
}

export interface OpenTypingSignal {
  state: TypingState;
  senderEncryptionPubKey: string;
  timestamp: number;
}

export async function buildTypingSignal(
  state: TypingState,
  identity: IdentityKeys,
  recipientPublicKey: Uint8Array,
  timestamp = Date.now(),
): Promise<TypingSignal> {
  const sodium = await initCrypto();
  if (recipientPublicKey.length !== sodium.crypto_box_PUBLICKEYBYTES) {
    throw new Error("Typing recipient key has an invalid length.");
  }
  if (state !== "typing" && state !== "stop") {
    throw new Error("Typing signal state is invalid.");
  }
  const id = crypto.randomUUID();
  const senderEncryptionPubKey = encodeBytes(identity.encryptionPublicKey);
  const recipientPubKey = encodeBytes(recipientPublicKey);
  const plaintext = textEncoder.encode(JSON.stringify({ state, timestamp }));
  let sealed: Uint8Array | undefined;
  try {
    sealed = sodium.crypto_box_seal(plaintext, recipientPublicKey);
    const signature = sodium.crypto_sign_detached(
      textEncoder.encode(
        JSON.stringify({
          id,
          senderEncryptionPubKey,
          recipientPubKey,
          sealed: encodeBytes(sealed),
          timestamp,
        }),
      ),
      identity.signingPrivateKey,
    );
    return {
      type: "typing",
      id,
      senderPubKey: encodeBytes(identity.signingPublicKey),
      senderEncryptionPubKey,
      recipientPubKey,
      sealed: encodeBytes(sealed),
      timestamp,
      signature: encodeBytes(signature),
    };
  } finally {
    plaintext.fill(0);
  }
}

export async function verifyTypingSignal(signal: TypingSignal): Promise<boolean> {
  const sodium = await initCrypto();
  try {
    const senderPublicKey = decodeBytes(signal.senderPubKey);
    const signature = decodeBytes(signal.signature);
    if (
      signal.type !== "typing" ||
      senderPublicKey.length !== sodium.crypto_sign_PUBLICKEYBYTES ||
      signature.length !== sodium.crypto_sign_BYTES ||
      !signal.id
    ) {
      return false;
    }
    return sodium.crypto_sign_verify_detached(
      signature,
      textEncoder.encode(
        JSON.stringify({
          id: signal.id,
          senderEncryptionPubKey: signal.senderEncryptionPubKey,
          recipientPubKey: signal.recipientPubKey,
          sealed: signal.sealed,
          timestamp: signal.timestamp,
        }),
      ),
      senderPublicKey,
    );
  } catch {
    return false;
  }
}

export async function openTypingSignal(
  signal: TypingSignal,
  identity: Pick<IdentityKeys, "encryptionPublicKey" | "encryptionPrivateKey">,
): Promise<OpenTypingSignal> {
  const sodium = await initCrypto();
  if (!(await verifyTypingSignal(signal))) {
    throw new Error("Typing signal signature is invalid.");
  }
  const recipientPubKey = decodeBytes(signal.recipientPubKey);
  if (!sodium.memcmp(recipientPubKey, identity.encryptionPublicKey)) {
    throw new Error("Typing signal is addressed to a different recipient.");
  }
  const sealed = decodeBytes(signal.sealed);
  const plaintext = sodium.crypto_box_seal_open(
    sealed,
    identity.encryptionPublicKey,
    identity.encryptionPrivateKey,
  );
  try {
    const parsed: unknown = JSON.parse(decodeUtf8(plaintext));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("state" in parsed) ||
      (parsed.state !== "typing" && parsed.state !== "stop")
    ) {
      throw new Error("Typing signal contains an invalid payload.");
    }
    return {
      state: parsed.state,
      senderEncryptionPubKey: signal.senderEncryptionPubKey,
      timestamp: signal.timestamp,
    };
  } finally {
    plaintext.fill(0);
  }
}
