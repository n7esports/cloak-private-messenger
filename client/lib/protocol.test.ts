import { describe, expect, it } from "vitest";
import { generateIdentity, initCrypto } from "./crypto";
import {
  buildEnvelope,
  createRatchetSession,
  getExpiredMessageIds,
  isEphemeralExpired,
  openEnvelope,
  rotateSessionKey,
  signEnvelope,
  verifySignedEnvelope,
  type InnerPayload,
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
