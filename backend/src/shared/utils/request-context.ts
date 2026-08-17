import type { Request } from "express";

// Express types req.headers["user-agent"] as string | string[] | undefined
// (headers can technically repeat). In practice it's always a single value
// for User-Agent; this normalizes it to what every audit/security call site
// actually wants.
export function getUserAgent(req: Request): string | undefined {
  const ua = req.headers["user-agent"];
  return Array.isArray(ua) ? ua[0] : ua;
}

export function getRouteParam(req: Request, name: string): string | undefined {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}
