import type { Response } from "express";
import { env, isProduction } from "../../config/env.js";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";
export const CSRF_COOKIE = "csrf_token";

// Auth model: refresh_token and access_token are HttpOnly (never readable
// by JS, immune to XSS token theft via document.cookie). SameSite=Lax is
// used rather than Strict because Strict would break the token refresh
// flow on top-level navigations arriving from external links/redirects.
// csrf_token is deliberately NOT HttpOnly (see csrf.ts) since the
// double-submit pattern requires JS to read it and echo it in a header.
function baseCookieOptions() {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE || isProduction,
    sameSite: "lax" as const,
    domain: env.COOKIE_DOMAIN === "localhost" ? undefined : env.COOKIE_DOMAIN,
    path: "/",
  };
}

export function setAccessTokenCookie(res: Response, token: string) {
  res.cookie(ACCESS_TOKEN_COOKIE, token, {
    ...baseCookieOptions(),
    maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
}

export function setRefreshTokenCookie(res: Response, token: string) {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...baseCookieOptions(),
    maxAge: env.REFRESH_TOKEN_TTL_SECONDS * 1000,
    // Scope the refresh cookie to the one endpoint that needs it so it
    // isn't attached to every ordinary API request.
    path: "/auth/refresh",
  });
}

export function setCsrfCookie(res: Response, token: string) {
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: env.COOKIE_SECURE || isProduction,
    sameSite: "lax" as const,
    domain: env.COOKIE_DOMAIN === "localhost" ? undefined : env.COOKIE_DOMAIN,
    path: "/",
    maxAge: env.REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  const opts = baseCookieOptions();
  res.clearCookie(ACCESS_TOKEN_COOKIE, opts);
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...opts, path: "/auth/refresh" });
  res.clearCookie(CSRF_COOKIE, { ...opts, httpOnly: false });
}
