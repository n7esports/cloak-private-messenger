import { describe, expect, it } from "vitest";
import { generateIdentity, initCrypto } from "./crypto";
import {
  buildEnvelope,
  buildSignedReceipt,
  buildTypingSignal,
  createRatchetSession,
  deriveAndSkipReceiveKey,
  getExpiredMessageIds,
  isEphemeralExpired,
  MAX_SKIPPED_KEYS,
  openEnvelope,
  openTypingSignal,
  rotateSessionKey,
  signEnvelope,
  verifySignedEnvelope,
  verifySignedReceipt,
  verifyTypingSignal,
  type InnerPayload,
  type RatchetSession,
} from "./protocol";

describe("anonymous message envelopes", () => {
  it("constructs and decrypts sealed, authenticated payloads", async () => {
    const recipient = await generateIdentity();
    const payload: InnerPayload = {
      type: "text",
      content: "This message is end-to-end encrypted.",
      ephemeralTimer: 60_000,
    };

    const envelope = await buildEnvelope(payload, recipient.encryptionPublicKey);
    const decrypted = await openEnvelope(envelope, recipient);

    expect(envelope.recipientPubKey).toBeTruthy();
    expect(envelope.ephemeralPubKey).toBeTruthy();
    expect(envelope.timestamp).toBeTypeOf("number");
    expect(decrypted).toEqual(payload);
  });

  it("rejects a payload addressed to a different identity", async () => {
    const recipient = await generateIdentity();
    const otherIdentity = await generateIdentity();
    const envelope = await buildEnvelope(
      { type: "text", content: "private" },
      recipient.encryptionPublicKey,
    );

    await expect(openEnvelope(envelope, otherIdentity)).rejects.toThrow(
      "different recipient",
    );
  });

  it("rotates matching per-contact send and receive session keys", async () => {
    const sodium = await initCrypto();
    const sender = await generateIdentity();
    const recipient = await generateIdentity();
    let senderSession = await createRatchetSession(
      sender.encryptionPublicKey,
      sender.encryptionPrivateKey,
      recipient.encryptionPublicKey,
    );
    let recipientSession = await createRatchetSession(
      recipient.encryptionPublicKey,
      recipient.encryptionPrivateKey,
      sender.encryptionPublicKey,
    );

    const firstSend = await rotateSessionKey(senderSession, "send");
    senderSession = firstSend.session;
    const firstReceive = await rotateSessionKey(recipientSession, "receive");
    recipientSession = firstReceive.session;
    expect(firstReceive.messageKey).toEqual(firstSend.messageKey);

    const firstEnvelope = await buildEnvelope(
      { type: "text", content: "message one" },
      recipient.encryptionPublicKey,
      firstSend.messageKey,
    );
    firstSend.messageKey.fill(0);
    await expect(
      openEnvelope(firstEnvelope, recipient, firstReceive.messageKey),
    ).resolves.toEqual({
      type: "text",
      content: "message one",
    });

    const secondSend = await rotateSessionKey(senderSession, "send");
    const secondReceive = await rotateSessionKey(recipientSession, "receive");
    expect(secondSend.messageKey).not.toEqual(firstReceive.messageKey);
    expect(secondReceive.messageKey).toEqual(secondSend.messageKey);
    expect(secondSend.messageKey).toHaveLength(sodium.crypto_secretbox_KEYBYTES);
    secondSend.messageKey.fill(0);
    secondReceive.messageKey.fill(0);
    firstReceive.messageKey.fill(0);
  });

  it("authenticates signed envelopes and detects tampering", async () => {
    const sender = await generateIdentity();
    const recipient = await generateIdentity();
    const envelope = await buildEnvelope(
      { type: "text", content: "signed content" },
      recipient.encryptionPublicKey,
    );
    const packet = await signEnvelope(envelope, sender, "message-1");

    await expect(verifySignedEnvelope(packet)).resolves.toBe(true);
    await expect(
      verifySignedEnvelope({
        ...packet,
        envelope: { ...packet.envelope, timestamp: packet.envelope.timestamp + 1 },
      }),
    ).resolves.toBe(false);
  });

  it("rejects unsupported self-destruct timers", async () => {
    const sodium = await initCrypto();
    const recipient = await generateIdentity();
    await expect(
      buildEnvelope(
        { type: "text", content: "invalid timer", ephemeralTimer: 30_000 },
        recipient.encryptionPublicKey,
      ),
    ).rejects.toThrow("Invalid message payload");
    expect(sodium.crypto_secretbox_KEYBYTES).toBe(32);
  });

  it("purges a self-destructing message when its timer expires", () => {
    const createdAt = 10_000;
    expect(isEphemeralExpired(createdAt, 5_000, 14_999)).toBe(false);
    expect(isEphemeralExpired(createdAt, 5_000, 15_000)).toBe(true);
    expect(isEphemeralExpired(createdAt, undefined, 99_999)).toBe(false);
    expect(isEphemeralExpired(createdAt, 30_000, 99_999)).toBe(false);
    expect(
      getExpiredMessageIds(
        [
          { id: "expired", timestamp: createdAt, ephemeralTimer: 5_000 },
          { id: "still-live", timestamp: createdAt, ephemeralTimer: 60_000 },
          { id: "permanent", timestamp: createdAt },
        ],
        15_000,
      ),
    ).toEqual(["expired"]);
  });

  it("binds the message id to the envelope signature", async () => {
    const sender = await generateIdentity();
    const recipient = await generateIdentity();
    const envelope = await buildEnvelope(
      { type: "text", content: "bound message id" },
      recipient.encryptionPublicKey,
    );
    const packet = await signEnvelope(envelope, sender, "message-1");

    await expect(verifySignedEnvelope(packet)).resolves.toBe(true);
    await expect(
      verifySignedEnvelope({ ...packet, id: "message-2" }),
    ).resolves.toBe(false);
  });
});

describe("E2EE attachments", () => {
  const attachment = {
    name: "photo.png",
    mime: "image/png",
    size: 12,
    data: "data:image/png;base64,iVBORw0KGgo=",
  };

  it("seals and decrypts an attachment inside the message envelope", async () => {
    const sender = await generateIdentity();
    const recipient = await generateIdentity();

    const envelope = await buildEnvelope(
      { type: "image", content: "Photo: photo.png", attachment },
      recipient.encryptionPublicKey,
    );
    const decrypted = await openEnvelope(envelope, recipient);

    expect(decrypted.attachment).toEqual(attachment);
    expect(decrypted.type).toBe("image");
  });

  it("rejects a payload with a malformed attachment", async () => {
    const recipient = await generateIdentity();
    await expect(
      buildEnvelope(
        {
          type: "file",
          content: "bad",
          attachment: { ...attachment, data: "not-a-data-url" },
        },
        recipient.encryptionPublicKey,
      ),
    ).rejects.toThrow("Invalid message payload");
  });

  it("rejects an attachment over the size limit", async () => {
    const recipient = await generateIdentity();
    await expect(
      buildEnvelope(
        {
          type: "file",
          content: "too big",
          attachment: { ...attachment, size: 5 * 1024 * 1024 },
        },
        recipient.encryptionPublicKey,
      ),
    ).rejects.toThrow("Invalid message payload");
  });

  it("carries a reply reference through the sealed envelope", async () => {
    const recipient = await generateIdentity();
    const replyTo = { id: "msg-1", alias: "Alex", excerpt: "original text" };
    const envelope = await buildEnvelope(
      { type: "text", content: "replying", replyTo },
      recipient.encryptionPublicKey,
    );
    const decrypted = await openEnvelope(envelope, recipient);
    expect(decrypted.replyTo).toEqual(replyTo);
  });

  it("rejects an over-long reply excerpt", async () => {
    const recipient = await generateIdentity();
    await expect(
      buildEnvelope(
        {
          type: "text",
          content: "bad reply",
          replyTo: { id: "m", alias: "A", excerpt: "x".repeat(500) },
        },
        recipient.encryptionPublicKey,
      ),
    ).rejects.toThrow("Invalid message payload");
  });
});

describe("E2EE typing signals", () => {
  it("seals and authenticates a typing signal round-trip", async () => {
    const sender = await generateIdentity();
    const recipient = await generateIdentity();

    const signal = await buildTypingSignal(
      "typing",
      sender,
      recipient.encryptionPublicKey,
    );

    await expect(verifyTypingSignal(signal)).resolves.toBe(true);
    const opened = await openTypingSignal(signal, recipient);
    expect(opened.state).toBe("typing");
    expect(opened.senderEncryptionPubKey).toBeTruthy();
  });

  it("rejects a typing signal with a tampered state", async () => {
    const sender = await generateIdentity();
    const recipient = await generateIdentity();
    const signal = await buildTypingSignal(
      "typing",
      sender,
      recipient.encryptionPublicKey,
    );

    await expect(
      verifyTypingSignal({ ...signal, sealed: `${signal.sealed}AA` }),
    ).resolves.toBe(false);
    await expect(
      openTypingSignal({ ...signal, timestamp: signal.timestamp + 1 }, recipient),
    ).rejects.toThrow("signature is invalid");
  });

  it("rejects a typing signal addressed to a different identity", async () => {
    const sender = await generateIdentity();
    const recipient = await generateIdentity();
    const otherIdentity = await generateIdentity();
    const signal = await buildTypingSignal(
      "stop",
      sender,
      recipient.encryptionPublicKey,
    );

    await expect(openTypingSignal(signal, otherIdentity)).rejects.toThrow(
      "different recipient",
    );
  });
});

describe("receiver derive-and-skip over a ratchet gap", () => {
  it("stashes skipped keys and decrypts a late out-of-order envelope", async () => {
    const alice = await generateIdentity();
    const bob = await generateIdentity();
    const baseSession = await createRatchetSession(
      bob.encryptionPublicKey,
      bob.encryptionPrivateKey,
      alice.encryptionPublicKey,
    );
    // rotateSessionKey zeroes the chain key in place, so each walk needs its
    // own deep copy of the session (the store always hands out a fresh
    // decrypt, so this aliasing never bites in production).
    const clone = () => ({
      ...baseSession,
      sendChainKey: new Uint8Array(baseSession.sendChainKey),
      receiveChainKey: new Uint8Array(baseSession.receiveChainKey),
    });
    // Model Bob RECEIVING from Alice via a single continuous send-chain walk
    // (exactly how the sender's store advances), capturing each message key.
    let walk: RatchetSession = clone();
    const keys: Uint8Array[] = [];
    for (let i = 0; i < 3; i += 1) {
      const rotated = await rotateSessionKey(walk, "receive");
      // Copy: later rotations / derive-and-skip zero chain buffers in place.
      keys.push(new Uint8Array(rotated.messageKey));
      walk = rotated.session;
    }
    const [s0Key, s1Key, s2Key] = keys;

    const msg0 = await buildEnvelope(
      { type: "text", content: "first" },
      bob.encryptionPublicKey,
      s0Key,
      Date.now(),
      0,
    );
    const msg1 = await buildEnvelope(
      { type: "text", content: "second" },
      bob.encryptionPublicKey,
      s1Key,
      Date.now(),
      1,
    );
    const msg2 = await buildEnvelope(
      { type: "text", content: "third" },
      bob.encryptionPublicKey,
      s2Key,
      Date.now(),
      2,
    );

    // Receive msg0 (counter 0), then msg2 (counter 2) — a gap of one.
    const r0 = await deriveAndSkipReceiveKey(clone(), msg0.counter);
    expect(await openEnvelope(msg0, bob, r0.messageKey)).toMatchObject({
      content: "first",
    });

    const r2 = await deriveAndSkipReceiveKey(r0.session, msg2.counter);
    // Counter 1 was skipped and stashed.
    expect(r2.skippedKeys.map(([counter]) => counter)).toEqual([1]);
    expect(await openEnvelope(msg2, bob, r2.messageKey)).toMatchObject({
      content: "third",
    });

    // The stashed key for counter 1 decrypts the late message.
    const stashed = r2.session.skippedKeys?.get(1);
    expect(stashed).toBeDefined();
    expect(await openEnvelope(msg1, bob, stashed!)).toMatchObject({
      content: "second",
    });
  });

  it("rejects a counter beyond the bounded skip range", async () => {
    const alice = await generateIdentity();
    const bob = await generateIdentity();
    const session = await createRatchetSession(
      bob.encryptionPublicKey,
      bob.encryptionPrivateKey,
      alice.encryptionPublicKey,
    );
    await expect(
      deriveAndSkipReceiveKey(session, MAX_SKIPPED_KEYS + 5),
    ).rejects.toThrow("skip range");
  });
});

describe("signed delivery receipts", () => {
  it("signs and verifies a receipt bound to the signer identity", async () => {
    const receiver = await generateIdentity();
    const sender = await generateIdentity();
    const receipt = await buildSignedReceipt(
      "message-123",
      "delivered",
      receiver,
      sender.encryptionPublicKey,
    );
    expect(await verifySignedReceipt(receipt)).toBe(true);
    // A tampered status or signer fails verification.
    expect(
      await verifySignedReceipt({ ...receipt, status: "read" }),
    ).toBe(false);
    expect(
      await verifySignedReceipt({ ...receipt, messageId: "other" }),
    ).toBe(false);
  });
});
