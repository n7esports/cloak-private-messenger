import { test } from "node:test";
import assert from "node:assert/strict";

// The bug reproduces when a token has the same JS code-unit length as the
// configured RELAY_TOKEN but a different UTF-8 byte length. Set the token FIRST
// so the module reads it before it is imported.
process.env.CLOAK_RELAY_TOKEN = "\u4E00"; // 1 code unit, 3 UTF-8 bytes

const { isAuthorizedRelayRequest } = await import("../src/index.js");
const configured = (process.env.CLOAK_RELAY_TOKEN ?? "").trim();

test("isAuthorizedRelayRequest: compare UTF-8 byte lengths, return false (no throw)", () => {
  const token = "\u00E9"; // 1 code unit, 2 UTF-8 bytes
  assert.equal(token.length, configured.length, "same code-unit length");
  assert.equal(Buffer.from(token, "utf8").length, 2, "supplied is 2 UTF-8 bytes");
  assert.equal(Buffer.from(configured, "utf8").length, 3, "expected is 3 UTF-8 bytes");

  // Bug: timingSafeEqual(2, 3) throws TypeError. Fixed: returns false.
  const ok = isAuthorizedRelayRequest({ authToken: token });
  assert.equal(ok, false);
});

test("isAuthorizedRelayRequest: correct token with multi-byte char still matches", () => {
  const ok = isAuthorizedRelayRequest({ authToken: "\u4E00" });
  assert.equal(ok, true);
});

test("isAuthorizedRelayRequest: wrong token returns false, never throws", () => {
  const ok = isAuthorizedRelayRequest({ authToken: "nomatch" });
  assert.equal(ok, false);
});
