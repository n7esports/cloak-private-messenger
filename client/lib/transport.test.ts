import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { supabaseMock, vaultMock } = vi.hoisted(() => ({
  supabaseMock: {
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
  vaultMock: {
    outboxRecords: [] as Array<Record<string, unknown>>,
    outbox: {
      orderBy: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(async (id: string) => {
        vaultMock.outboxRecords = vaultMock.outboxRecords.filter(
          (record) => record.id !== id,
        );
      }),
      update: vi.fn(),
    },
  },
}));

vi.mock("../src/lib/supabaseClient.js", () => ({
  supabase: supabaseMock,
}));

vi.mock("./vault", () => ({
  database: { outbox: vaultMock.outbox },
}));

vi.mock("./crypto", () => ({
  decryptVaultPayload: vi.fn(async () => {
    const packet = vaultMock.outboxRecords[0]?.packet;
    return new TextEncoder().encode(JSON.stringify(packet));
  }),
  encryptVaultPayload: vi.fn(),
}));

import {
  getInboxChannelName,
  TransportManager,
} from "./transport";
import { encodeBytes, type SignedEnvelope } from "./protocol";

interface MockChannel {
  handlers: Map<string, (event: { payload?: unknown }) => void>;
  subscribeCallback?: (status: string, error?: Error) => void;
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

const channels = new Map<string, MockChannel>();
const ownPublicKey = encodeBytes(new Uint8Array(32).fill(7));
const peerPublicKey = encodeBytes(new Uint8Array(32).fill(9));

function createMockChannel(): MockChannel {
  const channel: MockChannel = {
    handlers: new Map(),
    on: vi.fn(function (
      this: MockChannel,
      _type: string,
      filter: { event: string },
      handler: (event: { payload?: unknown }) => void,
    ) {
      this.handlers.set(filter.event, handler);
      return this;
    }),
    subscribe: vi.fn(function (
      this: MockChannel,
      callback: (status: string, error?: Error) => void,
    ) {
      this.subscribeCallback = callback;
      queueMicrotask(() => callback("SUBSCRIBED"));
      return this;
    }),
    send: vi.fn().mockResolvedValue("ok"),
  };
  return channel;
}

function makePacket(recipientPubKey: string): SignedEnvelope {
  return {
    type: "message",
    id: "message-id",
    senderPubKey: ownPublicKey,
    senderEncryptionPubKey: ownPublicKey,
    signature: "signature",
    envelope: {
      recipientPubKey,
      ephemeralPubKey: ownPublicKey,
      nonce: encodeBytes(new Uint8Array(24)),
      ciphertext: encodeBytes(new Uint8Array([1, 2, 3])),
      timestamp: Date.now(),
      counter: 0,
    },
  };
}

async function waitForSubscribe(topic = getInboxChannelName(ownPublicKey)): Promise<void> {
  await vi.waitFor(() => {
    expect(channels.get(topic)?.subscribeCallback).toBeDefined();
  });
}

beforeEach(() => {
  channels.clear();
  vaultMock.outboxRecords = [];
  vaultMock.outbox.orderBy.mockClear();
  vaultMock.outbox.put.mockClear();
  vaultMock.outbox.delete.mockClear();
  vaultMock.outbox.update.mockClear();
  vaultMock.outbox.orderBy.mockImplementation(() => ({
    toArray: vi.fn(async () => vaultMock.outboxRecords),
  }));
  supabaseMock.channel.mockImplementation(
    (name: string, _config: unknown): MockChannel => {
      const channel = createMockChannel();
      channels.set(name, channel);
      return channel;
    },
  );
  supabaseMock.removeChannel.mockResolvedValue("ok");
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("Supabase ephemeral relay transport", () => {
  it("subscribes to the recipient inbox with broadcast self disabled", async () => {
    const manager = new TransportManager();
    const onConnectionChange = vi.fn();
    manager.start(new Uint8Array(32), ownPublicKey, {
      onMessage: vi.fn(),
      onReceipt: vi.fn(),
      onSent: vi.fn(),
      onConnectionChange,
      onError: vi.fn(),
    });

    await waitForSubscribe();

    const topic = getInboxChannelName(ownPublicKey);
    expect(supabaseMock.channel).toHaveBeenCalledWith(topic, {
      config: { broadcast: { self: false } },
    });
    expect(channels.get(topic)?.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "envelope" },
      expect.any(Function),
    );
    expect(onConnectionChange).toHaveBeenCalledWith("connected");
    expect(vaultMock.outbox.orderBy).toHaveBeenCalledWith("createdAt");

    manager.stop();
  });

  it("sends signed envelopes through Supabase broadcast channels", async () => {
    const manager = new TransportManager();
    manager.start(new Uint8Array(32), ownPublicKey, {
      onMessage: vi.fn(),
      onReceipt: vi.fn(),
      onSent: vi.fn(),
      onConnectionChange: vi.fn(),
      onError: vi.fn(),
    });
    await waitForSubscribe();

    const packet = makePacket(peerPublicKey);
    await manager.sendEnvelope(packet);

    const outgoingChannel = channels.get(getInboxChannelName(peerPublicKey));
    expect(outgoingChannel?.send).toHaveBeenCalledWith({
      type: "broadcast",
      event: "envelope",
      payload: { packet },
    });

    manager.stop();
  });

  it("decrypts and flushes the encrypted outbox after the inbox is subscribed", async () => {
    const packet = makePacket(peerPublicKey);
    vaultMock.outboxRecords = [
      {
        id: packet.id,
        ciphertext: "encrypted",
        nonce: "nonce",
        attempts: 0,
        nextAttemptAt: Date.now(),
        createdAt: Date.now(),
        packet,
      },
    ];
    const manager = new TransportManager();
    const onSent = vi.fn();
    manager.start(new Uint8Array(32), ownPublicKey, {
      onMessage: vi.fn(),
      onReceipt: vi.fn(),
      onSent,
      onConnectionChange: vi.fn(),
      onError: vi.fn(),
    });

    await vi.waitFor(() => {
      expect(channels.get(getInboxChannelName(peerPublicKey))?.send).toHaveBeenCalledWith({
        type: "broadcast",
        event: "envelope",
        payload: { packet },
      });
    });
    expect(vaultMock.outbox.delete).toHaveBeenCalledWith(packet.id);
    expect(onSent).toHaveBeenCalledWith(packet.id);

    manager.stop();
  });

  it.each(["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"])(
    "marks a failed inbox subscription (%s) disconnected",
    async (status) => {
      const manager = new TransportManager();
      const onConnectionChange = vi.fn();
      manager.start(new Uint8Array(32), ownPublicKey, {
        onMessage: vi.fn(),
        onReceipt: vi.fn(),
        onSent: vi.fn(),
        onConnectionChange,
        onError: vi.fn(),
      });
      await waitForSubscribe();
      const channel = channels.get(getInboxChannelName(ownPublicKey));
      channel?.subscribeCallback?.(status, new Error("subscription failed"));

      expect(onConnectionChange).toHaveBeenCalledWith("disconnected");
      manager.stop();
    },
  );

  it("dead-letters a queued envelope that keeps failing instead of retrying forever", async () => {
    // L5 regression: a permanently failing send must eventually drop the
    // record from the outbox rather than backing off forever.
    const packet = makePacket(peerPublicKey);
    vaultMock.outboxRecords = [
      {
        id: packet.id,
        ciphertext: "encrypted",
        nonce: "nonce",
        attempts: 9, // one below the cap; this drain attempt is the 10th
        nextAttemptAt: Date.now(),
        createdAt: Date.now(),
        packet,
      },
    ];
    const failingChannel = {
      ...createMockChannel(),
      send: vi.fn().mockRejectedValue(new Error("broadcast failed")),
    };
    supabaseMock.channel.mockImplementation((name: string): MockChannel => {
      const channel =
        name === getInboxChannelName(peerPublicKey)
          ? (failingChannel as unknown as MockChannel)
          : createMockChannel();
      channels.set(name, channel);
      return channel;
    });

    const manager = new TransportManager();
    const onError = vi.fn();
    manager.start(new Uint8Array(32), ownPublicKey, {
      onMessage: vi.fn(),
      onReceipt: vi.fn(),
      onSent: vi.fn(),
      onConnectionChange: vi.fn(),
      onError,
    });

    await vi.waitFor(() => {
      expect(vaultMock.outbox.delete).toHaveBeenCalledWith(packet.id);
    });
    // It must have reported the failure but NOT scheduled further retries.
    expect(onError).toHaveBeenCalled();
    expect(vaultMock.outbox.update).not.toHaveBeenCalled();

    manager.stop();
  });

  it("creates stable URL-safe inbox channel names from public keys", () => {
    const name = getInboxChannelName(ownPublicKey);
    expect(name).toMatch(/^cloak-inbox-[A-Za-z0-9_-]+$/);
    expect(getInboxChannelName(ownPublicKey)).toBe(name);
    expect(() => getInboxChannelName("not-a-key")).toThrow(
      "Invalid base64-encoded cryptographic data.",
    );
  });
});
