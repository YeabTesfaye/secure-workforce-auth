import type { NextFunction, Request, Response } from "express";
import { generateOpaqueToken } from "../infrastructure/crypto/tokens.js";
import { ForbiddenError } from "../shared/errors/app-error.js";
import { CSRF_COOKIE, setCsrfCookie } from "../modules/auth/auth.cookies.js";

/**
 * CSRF THREAT MODEL (documented per project requirement)
 * ---------------------------------------------------------------------
 * Which endpoints need it: any state-changing request (POST/PATCH/PUT/
 * DELETE) that relies on the browser automatically attaching cookies for
 * authentication. Pure Bearer-token API clients (mobile apps, service
 * accounts using Authorization: Bearer) are exempt, because CSRF is only
 * possible when the browser silently attaches credentials cross-site --
 * there is no such thing as a "confused browser" for a header the client
 * sets deliberately.
 *
 * Why: access_token and refresh_token are HttpOnly cookies. If we relied
 * on cookie presence alone to authenticate mutating requests, any other
 * site could trigger POST /organizations/:id (with the user's browser
 * auto-attaching the auth cookie) and the request would look legitimate.
 *
 * Cookie configuration: csrf_token is a NON-HttpOnly, SameSite=Lax cookie
 * containing a random value. Because it is not HttpOnly, only JavaScript
 * running on our own origin can read it (a cross-site attacker page has no
 * way to read another origin's cookies -- that's the same-origin policy,
 * not something CSRF tokens provide on their own).
 *
 * How the attack is prevented: this middleware requires the request to
 * include an X-CSRF-Token header whose value matches the csrf_token
 * cookie. A cross-site attacker can make the browser SEND the cookie
 * automatically, but cannot READ its value to also set the matching
 * header (same-origin policy blocks that read). SameSite=Lax additionally
 * blocks the cookie from being attached at all on cross-site POST
 * requests, which is defense in depth on top of the double-submit check.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function csrfProtection(req: Request, _res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  // Bearer-token clients are not cookie-authenticated, so CSRF does not apply.
  if (req.headers.authorization?.startsWith("Bearer ")) return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE];
  const headerToken = req.header("x-csrf-token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    throw new ForbiddenError("CSRF validation failed");
  }

  next();
}

// Issues a fresh CSRF cookie. Called after login/refresh so the client
// always has a current token to echo back on the next mutating request.
export function issueCsrfToken(res: Response): string {
  const token = generateOpaqueToken();
  setCsrfCookie(res, token);
  return token;
}
