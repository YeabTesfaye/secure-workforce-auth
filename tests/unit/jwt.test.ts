import { describe, it, expect } from "vitest";
import jwt from "jsonwebtoken";
import { signAccessToken, verifyAccessToken } from "../../src/infrastructure/crypto/jwt.js";
import { randomUUID } from "node:crypto";

describe("access tokens", () => {
  it("signs and verifies a round trip", () => {
    const payload = { sub: randomUUID(), tokenVersion: randomUUID(), sessionId: randomUUID() };
    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);
    expect(decoded.sub).toEqual(payload.sub);
    expect(decoded.tokenVersion).toEqual(payload.tokenVersion);
    expect(decoded.sessionId).toEqual(payload.sessionId);
  });

  it("throws on a tampered token", () => {
    const token = signAccessToken({ sub: randomUUID(), tokenVersion: randomUUID(), sessionId: randomUUID() });
    const tampered = token.slice(0, -2) + "xx";
    expect(() => verifyAccessToken(tampered)).toThrow();
  });

  it("throws on a token signed with a different secret", () => {
    const forged = jwt.sign({ sub: "attacker" }, "wrong-secret-that-is-at-least-32-chars-long");
    expect(() => verifyAccessToken(forged)).toThrow();
  });
});
