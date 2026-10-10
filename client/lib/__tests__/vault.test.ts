import { describe, expect, it, beforeAll } from "vitest";
import { wrapVaultKey, unwrapVaultKey } from "../vault";

/**
 * Regression test for the zeroed-IV bug in wrapVaultKey.
 *
 * The vault key is wrapped with AES-GCM using a per-device non-extractable
 * key held in IndexedDB. This test exercises the REAL crypto.subtle (AES-GCM)
 * path — the bug was precisely in the interaction between the in-memory IV
 * buffer, the base64 snapshot, and real AES-GCM, so mocking subtle would hide
 * it. Only IndexedDB is shimmed (Dexie's constructor and the wrapper-key
 * store need it); crypto.subtle is the runtime's real implementation.
 */

// Deferred callback firing: real IDB requests fire their onsuccess/onerror
// AFTER the caller has attached the handlers, so the shim schedules on a
// macrotask rather than a microtask.
function fireLater(fn: (() => void) | undefined) {
  setTimeout(() => fn?.(), 0);
}

class FakeObjectStore {
  private data = new Map<string, unknown>();
  get(key: string) {
    const request: { result?: unknown; onsuccess?: () => void; onerror?: () => void; error?: unknown } = {};
    fireLater(() => {
      request.result = this.data.get(key);
      request.onsuccess?.();
    });
    return request;
  }
  put(value: unknown, key: string) {
    this.data.set(key, value);
  }
}

class FakeTransaction {
  oncomplete?: () => void;
  onerror?: () => void;
  onabort?: () => void;
  error?: unknown;
  constructor(private store: FakeObjectStore) {}
  objectStore() {
    return this.store;
  }
}

class FakeDatabase {
  private store = new FakeObjectStore();
  close() {}
  createObjectStore() {
    return this.store;
  }
  transaction() {
    const transaction = new FakeTransaction(this.store);
    fireLater(() => transaction.oncomplete?.());
    return transaction;
  }
}

beforeAll(() => {
  const fakeDb = new FakeDatabase();
  (globalThis as Record<string, unknown>).indexedDB = {
    open() {
      const request: {
        result?: FakeDatabase;
        onupgradeneeded?: () => void;
        onsuccess?: () => void;
        onerror?: () => void;
        onblocked?: () => void;
        error?: unknown;
      } = {};
      fireLater(() => {
        request.result = fakeDb;
        request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
    deleteDatabase() {
      const request: { onsuccess?: () => void; onerror?: () => void; onblocked?: () => void } = {};
      fireLater(() => request.onsuccess?.());
      return request;
    },
  };
});

describe("vault key wrapping", () => {
  it("round-trips a 32-byte key with a non-zero IV (regression: zeroed IV)", async () => {
    const key = new Uint8Array(32);
    for (let i = 0; i < key.length; i += 1) key[i] = (i * 7 + 3) & 0xff;

    const envelope = await wrapVaultKey(key);

    // The IV snapshot must NOT be all-zero bytes — the original bug encoded
    // the buffer after zeroing it, producing an all-zero IV that could never
    // decrypt.
    const ivBytes = Uint8Array.from(atob(envelope.iv), (c) => c.charCodeAt(0));
    expect(ivBytes).toHaveLength(12);
    expect([...ivBytes].some((byte) => byte !== 0)).toBe(true);

    const unwrapped = await unwrapVaultKey(envelope);
    expect([...unwrapped]).toEqual([...key]);
  });

  it("rejects a tampered wrapped envelope", async () => {
    const key = new Uint8Array(32).fill(9);
    const envelope = await wrapVaultKey(key);

    const ciphertextBytes = Uint8Array.from(atob(envelope.ciphertext), (c) =>
      c.charCodeAt(0),
    );
    ciphertextBytes[0] ^= 0xff;
    const tampered = {
      ...envelope,
      ciphertext: btoa(String.fromCharCode(...ciphertextBytes)),
    };

    await expect(unwrapVaultKey(tampered)).rejects.toBeDefined();
  });
});
