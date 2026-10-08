import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveRelayEndpoints, TransportManager } from "./transport";

const originalRelayUrl = process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
const originalWsUrl = process.env.NEXT_PUBLIC_WS_URL;
const originalHttpRelayUrl = process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;
const originalBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

afterEach(() => {
  if (originalRelayUrl === undefined) {
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
  } else {
    process.env.NEXT_PUBLIC_CLOAK_RELAY_URL = originalRelayUrl;
  }
  if (originalWsUrl === undefined) {
    delete process.env.NEXT_PUBLIC_WS_URL;
  } else {
    process.env.NEXT_PUBLIC_WS_URL = originalWsUrl;
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
    delete process.env.NEXT_PUBLIC_WS_URL;
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
    delete process.env.NEXT_PUBLIC_WS_URL;
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
      httpUrl: "https://relay.example.test/relay",
    });
  });

  it("uses NEXT_PUBLIC_WS_URL and resolves relative URLs against the backend origin", () => {
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
    process.env.NEXT_PUBLIC_WS_URL = "/relay";
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://backend.example.test/api";
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;

    expect(resolveRelayEndpoints()).toEqual({
      websocketUrl: "wss://backend.example.test/relay",
      httpUrl: "https://backend.example.test/relay",
    });
  });

  it("derives a secure WebSocket URL from an HTTPS backend", () => {
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_URL;
    delete process.env.NEXT_PUBLIC_WS_URL;
    delete process.env.NEXT_PUBLIC_CLOAK_RELAY_HTTP_URL;
    process.env.NEXT_PUBLIC_BACKEND_URL = "https://backend.example.test";

    expect(resolveRelayEndpoints()).toEqual({
      websocketUrl: "wss://backend.example.test/",
      httpUrl: "https://backend.example.test/relay",
    });
  });
});
