import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveRelayEndpoints, TransportManager } from "./transport";

const originalRelayUrl = process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
const originalHttpRelayUrl = process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;
const originalBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

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
  if (originalBackendUrl === undefined) {
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
  } else {
    process.env.NEXT_PUBLIC_BACKEND_URL = originalBackendUrl;
  }
});

describe("relay configuration", () => {
  it("silently retains local-queue fallback when no relay is configured", () => {
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;
    delete process.env.NEXT_PUBLIC_BACKEND_URL;
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

    expect(onError).not.toHaveBeenCalled();
    manager.stop();
  });

  it("derives WebSocket and HTTP relay endpoints from the backend URL", () => {
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;
    process.env.NEXT_PUBLIC_BACKEND_URL = "http://localhost:5000";

    expect(resolveRelayEndpoints()).toEqual({
      websocketUrl: "ws://localhost:5000/",
      httpUrl: "http://localhost:5000/relay",
    });
  });

  it("prefers an explicitly configured relay endpoint", () => {
    process.env.NEXT_PUBLIC_CLOAK_RELAY_URL = "wss://relay.example.test/relay";
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;
    process.env.NEXT_PUBLIC_BACKEND_URL = "http://localhost:5000";

    expect(resolveRelayEndpoints()).toEqual({
      websocketUrl: "wss://relay.example.test/relay",
      httpUrl: "https://relay.example.test/relay/relay",
    });
  });
});
