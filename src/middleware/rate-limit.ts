import type { NextFunction, Request, Response } from "express";
import { getUserAgent } from "../shared/utils/request-context.js";
import { redis } from "../infrastructure/redis/client.js";
import { redisKeys } from "../infrastructure/redis/keys.js";
import { TooManyRequestsError } from "../shared/errors/app-error.js";
import { recordSecurityEvent } from "../modules/audit/audit.service.js";

interface RateLimitOptions {
  bucket: string;
  max: number;
  windowSeconds: number;
  // How to derive the rate-limit identity for a request. Defaults to IP.
  keyFn?: (req: Request) => string;
}

// Fixed-window counter via INCR + EXPIRE. Simpler than a true sliding-window
// log and sufficient here: the worst case lets slightly more than `max`
// requests through at a window boundary, which is an acceptable trade-off
// against the extra Redis round trips a sorted-set implementation needs.
export function rateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    void (async () => {
      try {
        const identity = options.keyFn ? options.keyFn(req) : req.ip ?? "unknown";
        const key = redisKeys.rateLimit(options.bucket, identity);

        const count = await redis.incr(key);
        if (count === 1) {
          await redis.expire(key, options.windowSeconds);
        }

        const ttl = await redis.ttl(key);
        res.setHeader("X-RateLimit-Limit", String(options.max));
        res.setHeader("X-RateLimit-Remaining", String(Math.max(0, options.max - count)));

        if (count > options.max) {
          await recordSecurityEvent({
            event: "RATE_LIMIT_EXCEEDED",
            ipAddress: req.ip,
            userAgent: getUserAgent(req),
            metadata: { bucket: options.bucket, path: req.path },
          });
          throw new TooManyRequestsError(
            "Too many requests, please try again later",
            ttl > 0 ? ttl : options.windowSeconds
          );
        }

        next();
      } catch (err) {
        next(err);
      }
    })();
  };
}

// Keys by authenticated email (from validated request body) rather than IP,
// so a distributed credential-stuffing attack against one account is still
// rate limited even when spread across many source IPs.
export function keyByEmailFromBody(req: Request): string {
  const email = (req.body as { email?: string } | undefined)?.email;
  return email ? email.toLowerCase() : req.ip ?? "unknown";
}
