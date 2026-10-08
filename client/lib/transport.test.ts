import { afterEach, describe, expect, it, vi } from "vitest";
import { TransportManager } from "./transport";

const originalRelayUrl = process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
const originalHttpRelayUrl = process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;

afterEach(() => {
  if (originalRelayUrl === undefined) {
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
  } else {
    process.env.NEXT_PUBLIC_CLOAK_RELAY_URL = originalRelayUrl;
  }
  if (originalHttpRelayUrl === undefined) {
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;
  } else {
    process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL = originalHttpRelayUrl;
  }
});

describe("relay configuration", () => {
  it("does not attempt a placeholder relay when no endpoint is configured", () => {
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;
    const manager = new TransportManager();
    const onError = vi.fn();
    const callbacks = {
      onMessage: vi.fn(),
      onReceipt: vi.fn(),
      onSent: vi.fn(),
      onConnectionChange: vi.fn(),
      onError,
    };

    manager.start(new Uint8Array(32), "recipient-key", callbacks);

    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].message).toContain(
      "No relay is configured",
    );
    manager.stop();
  });
});
