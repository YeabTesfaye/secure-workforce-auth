import argon2 from "argon2";

// OWASP-recommended Argon2id parameters for a general-purpose auth service
// (2024/2025 guidance): memory cost in KiB, 3 iterations, 4 parallel lanes.
// Tune memoryCost down only if the deployment target is memory-constrained;
// never drop below argon2id or reduce below ~19 MiB.
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // ~19 MiB
  timeCost: 3,
  parallelism: 4,
} as const;

export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plaintext);
  } catch {
    // Malformed hash or verification error. Fail closed.
    return false;
  }
}

// A minimal deny-list of common/breached passwords. In production this
// should be backed by a proper corpus (e.g. Have I Been Pwned k-anonymity
// range API) but a static list demonstrates the control and works offline.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "123456", "12345678", "qwerty",
  "letmein", "welcome", "admin123", "iloveyou", "monkey123", "dragon123",
  "football", "baseball", "trustno1", "sunshine1", "master123", "abc12345",
]);

export function isCommonPassword(plaintext: string): boolean {
  return COMMON_PASSWORDS.has(plaintext.toLowerCase());
}
