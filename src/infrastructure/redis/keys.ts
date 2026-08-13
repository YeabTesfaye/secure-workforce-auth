// Centralized Redis key builders. Keeping these in one place avoids the
// classic bug where two modules use slightly different key formats and
// silently stop seeing each other's data.
export const redisKeys = {
  // Login failure counter, scoped per-email so a distributed attacker
  // hitting one account from many IPs still triggers lockout.
  loginFailures: (email: string) => `auth:login:failures:${email.toLowerCase()}`,
  accountLock: (email: string) => `auth:login:lock:${email.toLowerCase()}`,

  // Sliding-window rate limit buckets, scoped per IP and per route family.
  rateLimit: (bucket: string, identifier: string) => `ratelimit:${bucket}:${identifier}`,

  // Registration abuse tracking, per IP.
  registerAttempts: (ip: string) => `auth:register:attempts:${ip}`,
};
