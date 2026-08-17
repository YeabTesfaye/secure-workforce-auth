import { describe, it, expect } from "vitest";
import { generateOpaqueToken, hashToken, safeCompareHex } from "../../src/infrastructure/crypto/tokens.js";

describe("opaque tokens", () => {
  it("generates a high-entropy, URL-safe token", () => {
    const token = generateOpaqueToken();
    expect(token.length).toBeGreaterThan(40);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generates unique tokens on each call", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateOpaqueToken()));
    expect(tokens.size).toBe(100);
  });

  it("hashes deterministically (same input -> same hash)", () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toEqual(hashToken(token));
  });

  it("produces different hashes for different tokens", () => {
    expect(hashToken(generateOpaqueToken())).not.toEqual(hashToken(generateOpaqueToken()));
  });
});

describe("safeCompareHex", () => {
  it("returns true for identical hex strings", () => {
    const hash = hashToken("some-value");
    expect(safeCompareHex(hash, hash)).toBe(true);
  });

  it("returns false for different hex strings", () => {
    expect(safeCompareHex(hashToken("a"), hashToken("b"))).toBe(false);
  });

  it("returns false (not throw) for mismatched lengths", () => {
    expect(safeCompareHex("ab", "abcd")).toBe(false);
  });
});
