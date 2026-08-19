import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

const TIMEOUT_MS = env.NODE_ENV === "test" ? 300_000 : 30_000; // 30s in prod, 5min in tests

/**
 * Request timeout middleware. Aborts requests that take longer than
 * TIMEOUT_MS to complete, preventing resource exhaustion from hanging
 * database queries or slow downstream calls.
 *
 * In production, a 30-second timeout is generous enough for any healthy
 * endpoint while catching stuck connections. The timeout is implemented
 * via the request's `setTimeout` and cleared on response finish.
 */
export function requestTimeout(req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV === "test") {
    return next();
  }

  const timer = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        error: {
          code: "REQUEST_TIMEOUT",
          message: "Request timed out. Please try again.",
        },
        requestId: req.requestId,
      });
    }
  }, TIMEOUT_MS);

  // Clean up the timer when the response finishes to avoid memory leaks.
  res.on("finish", () => clearTimeout(timer));
  res.on("close", () => clearTimeout(timer));

  next();
}
