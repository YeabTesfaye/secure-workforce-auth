import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError, TooManyRequestsError } from "../shared/errors/app-error.js";
import { isProduction } from "../config/env.js";

// Must be registered last. Maps typed AppErrors and ZodErrors to consistent
// JSON responses; anything unrecognized becomes a generic 500 with no
// internal detail leaked to the client (stack traces only logged server-side).
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "Validation failed", details: err.flatten() },
      requestId: req.requestId,
    });
  }

  if (err instanceof AppError) {
    if (err instanceof TooManyRequestsError && err.retryAfterSeconds) {
      res.setHeader("Retry-After", String(err.retryAfterSeconds));
    }
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
      requestId: req.requestId,
    });
  }

  console.error(`[${req.requestId}] Unhandled error:`, err);
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: isProduction ? "An unexpected error occurred" : String(err),
    },
    requestId: req.requestId,
  });
}
