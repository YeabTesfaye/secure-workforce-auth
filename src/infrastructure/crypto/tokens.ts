import { randomBytes, createHash, timingSafeEqual } from "node:crypto";

// Generates a URL-safe, high-entropy opaque token (256 bits). Used for
// refresh tokens, email verification links, and password reset links.
// The raw value is what goes to the client/email; only its hash is stored.
export function generateOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

// Constant-time comparison to avoid timing side-channels when comparing
// caller-supplied hashes against stored ones outside of a DB equality check.
export function safeCompareHex(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
