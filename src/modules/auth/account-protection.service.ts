import { redis } from "../../infrastructure/redis/client.js";
import { redisKeys } from "../../infrastructure/redis/keys.js";
import { env } from "../../config/env.js";

// Tracks failed login attempts per-email in Redis (fast, auto-expiring).
// After LOGIN_FAILURE_THRESHOLD consecutive failures, the account is locked
// for LOGIN_LOCKOUT_SECONDS. A successful login or the lockout TTL expiring
// clears the counter.
export async function recordLoginFailure(email: string): Promise<{ locked: boolean }> {
  const failuresKey = redisKeys.loginFailures(email);
  const failures = await redis.incr(failuresKey);
  if (failures === 1) {
    // Failure counter itself expires after the lockout window so that
    // slow, spaced-out guessing attempts don't accumulate indefinitely.
    await redis.expire(failuresKey, env.LOGIN_LOCKOUT_SECONDS);
  }

  if (failures >= env.LOGIN_FAILURE_THRESHOLD) {
    await redis.set(redisKeys.accountLock(email), "1", "EX", env.LOGIN_LOCKOUT_SECONDS);
    return { locked: true };
  }
  return { locked: false };
}

export async function clearLoginFailures(email: string): Promise<void> {
  await redis.del(redisKeys.loginFailures(email), redisKeys.accountLock(email));
}

export async function isAccountLocked(email: string): Promise<boolean> {
  const locked = await redis.get(redisKeys.accountLock(email));
  return locked !== null;
}

export async function getLockoutTtlSeconds(email: string): Promise<number> {
  const ttl = await redis.ttl(redisKeys.accountLock(email));
  return ttl > 0 ? ttl : env.LOGIN_LOCKOUT_SECONDS;
}
