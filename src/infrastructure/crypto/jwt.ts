import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

// Access tokens are short-lived and stateless (not looked up in DB per
// request). They carry only identity + a tokenVersion pin, never roles or
// permissions — those are always resolved fresh from the DB/cache per
// request so a role change takes effect immediately rather than waiting
// for token expiry.
export interface AccessTokenPayload {
  sub: string; // user id
  tokenVersion: string; // must match users.tokenVersion or the token is stale
  sessionId: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    issuer: "secure-workforce-auth",
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    issuer: "secure-workforce-auth",
  });
  return decoded as AccessTokenPayload;
}
