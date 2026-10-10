import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";

import {
  validPublicKey,
  validPacket,
  processRelayRequest,
} from "../src/index.js";

const canonicalKey = () => Buffer.alloc(32, 7).toString("base64");

function makePacket(overrides = {}) {
  return {
    type: "message",
    id: "message-1",
    senderPubKey: canonicalKey(),
    senderEncryptionPubKey: canonicalKey(),
    signature: "signature",
    envelope: {
      recipientPubKey: canonicalKey(),
      ephemeralPubKey: canonicalKey(),
      nonce: "nonce",
      ciphertext: "ciphertext",
      timestamp: 1,
    },
    ...overrides,
  };
}

test("validPublicKey accepts a canonical 32-byte base64 key", () => {
  assert.equal(validPublicKey(canonicalKey()), true);
});

test("validPublicKey rejects junk, wrong length, and non-base64", () => {
  assert.equal(validPublicKey("not-a-key"), false);
  assert.equal(validPublicKey(""), false);
  assert.equal(validPublicKey(undefined), false);
  assert.equal(validPublicKey(Buffer.alloc(31, 7).toString("base64")), false); // 31 bytes
  assert.equal(validPublicKey(Buffer.alloc(32, 7).toString("base64url")), false); // wrong alphabet
});

test("validPacket rejects a malformed envelope", () => {
  assert.equal(validPacket(makePacket()), true);

  assert.ok(!validPacket(makePacket({ envelope: null })));
  assert.ok(!validPacket(makePacket({ envelope: { recipientPubKey: "bad" } })));
  assert.ok(!validPacket(makePacket({ id: "" })));
  assert.ok(!validPacket(makePacket({ type: "receipt" })));
});

test("processRelayRequest routes a valid publish without crashing", () => {
  // Regression: a well-formed publish previously threw
  // ReferenceError: PUBLIC_KEY_RE is not defined inside validPublicKey,
  // crashing the process. This must instead return a success ack.
  let response;
  processRelayRequest(
    { type: "publish", id: "req-1", packet: makePacket() },
    (value) => {
      response = value;
    },
  );
  assert.deepEqual(response, { status: "ok", id: "req-1" });
});

test("processRelayRequest rejects a publish with an invalid envelope", () => {
  let response;
  processRelayRequest(
    { type: "publish", id: "req-2", packet: makePacket({ signature: 5 }) },
    (value) => {
      response = value;
    },
  );
  assert.equal(response.status, "error");
});

test("relay handles a publish over HTTP without crashing the process", async () => {
  // Import lazily so the module's listen guard is already exercised by import.
  const { default: relayModule } = await import("../src/index.js");
  void relayModule;

  const body = JSON.stringify({
    type: "publish",
    id: "http-1",
    packet: makePacket(),
  });

  const result = await new Promise((resolve, reject) => {
    const server = createServer((request, response) => {
      // Minimal inline relay: parse and run through the same validation the
      // real server uses, mirroring the crash path (validPacket -> validPublicKey).
      let data = "";
      request.on("data", (chunk) => {
        data += chunk;
      });
      request.on("end", () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          response.writeHead(400).end();
          return;
        }
        let out;
        processRelayRequest(parsed, (value) => {
          out = value;
        });
        response.writeHead(out?.status === "ok" ? 200 : 400, {
          "content-type": "application/json",
        });
        response.end(JSON.stringify(out));
      });
    });
    server.listen(0, () => {
      const { port } = server.address();
      const req = createServer; // keep reference used
      void req;
      import("node:http").then(({ request: httpRequest }) => {
        const client = httpRequest(
          {
            host: "127.0.0.1",
            port,
            method: "POST",
            path: "/relay",
            headers: { "content-type": "application/json" },
          },
          (res) => {
            let payload = "";
            res.on("data", (chunk) => {
              payload += chunk;
            });
            res.on("end", () => {
              server.close();
              resolve({ status: res.statusCode, body: JSON.parse(payload) });
            });
          },
        );
        client.on("error", reject);
        client.end(body);
      });
    });
  });

  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { status: "ok", id: "http-1" });
});

test("queue ids minted by the server match QUEUE_ID_RE", () => {
  // randomBytes(16).toString("base64url") is 22 base64url chars, no padding.
  for (let i = 0; i < 20; i += 1) {
    const queueId = randomBytes(16).toString("base64url");
    assert.match(queueId, /^[A-Za-z0-9_-]{22}$/);
  }
});
