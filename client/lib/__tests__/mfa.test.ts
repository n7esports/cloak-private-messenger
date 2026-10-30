import { describe, it, expect } from "vitest";
import { generateRecoveryCodes, hashRecoveryCode } from "@/lib/mfa";

describe("mfa recovery codes", () => {
 it("generates 10 unique codes", () => {
  const codes = generateRecoveryCodes();
  expect(codes).toHaveLength(10);
  expect(new Set(codes).size).toBe(10);
 });

 it("produces stable hashes", async () => {
  const code = "ABCD1234EF56";
  const h1 = await hashRecoveryCode(code);
  const h2 = await hashRecoveryCode(code);
  expect(h1).toBe(h2);
  expect(h1).not.toBe(code);
 });
});
