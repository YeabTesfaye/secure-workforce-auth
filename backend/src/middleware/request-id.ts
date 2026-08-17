import type { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";

// Every request gets a correlation ID, echoed back in the response header
// and available to logging/audit calls for tracing across services.
export function requestId(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  req.requestId = incoming && incoming.length <= 100 ? incoming : randomUUID();
  res.setHeader("x-request-id", req.requestId);
  next();
}
