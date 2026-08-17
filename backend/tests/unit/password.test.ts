import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, isCommonPassword } from "../../src/infrastructure/crypto/password.js";

describe("password hashing", () => {
  it("hashes a password to an argon2id string", async () => {
    const hash = await hashPassword("SuperSecret123!");
    expect(hash).toMatch(/^\$argon2id\$/);
  });

  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("SuperSecret123!");
    await expect(verifyPassword(hash, "SuperSecret123!")).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("SuperSecret123!");
    await expect(verifyPassword(hash, "WrongPassword123!")).resolves.toBe(false);
  });

  it("fails closed on a malformed hash rather than throwing", async () => {
    await expect(verifyPassword("not-a-real-hash", "anything")).resolves.toBe(false);
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const a = await hashPassword("SuperSecret123!");
    const b = await hashPassword("SuperSecret123!");
    expect(a).not.toEqual(b);
  });

  it("flags common passwords", () => {
    expect(isCommonPassword("password123")).toBe(true);
    expect(isCommonPassword("Xk9#mQ2$vLp7")).toBe(false);
  });
});
