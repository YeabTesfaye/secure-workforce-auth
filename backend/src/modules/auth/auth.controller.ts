import type { Request, Response } from "express";
import { getUserAgent } from "../../shared/utils/request-context.js";
import * as authService from "./auth.service.js";
import * as tokenService from "./refresh-token.service.js";
import { revokeSession } from "../sessions/sessions.service.js";
import { signAccessToken } from "../../infrastructure/crypto/jwt.js";
import { db } from "../../infrastructure/database/client.js";
import { users } from "../../../db/schema/index.js";
import { eq } from "drizzle-orm";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  changePasswordSchema,
} from "./auth.schemas.js";
import {
  setAccessTokenCookie,
  setRefreshTokenCookie,
  clearAuthCookies,
  REFRESH_TOKEN_COOKIE,
} from "./auth.cookies.js";
import { issueCsrfToken } from "../../middleware/csrf.js";
import { UnauthorizedError } from "../../shared/errors/app-error.js";
import { recordSecurityEvent } from "../audit/audit.service.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";

function ctxFrom(req: Request) {
  return { ip: req.ip, userAgent: getUserAgent(req) };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const input = registerSchema.parse(req.body);
  const user = await authService.registerUser(input, ctxFrom(req));
  res.status(201).json({
    data: { id: user.id, email: user.email, emailVerified: user.emailVerified },
  });
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = verifyEmailSchema.parse(req.body);
  await authService.verifyEmail(token);
  res.status(200).json({ data: { verified: true } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input, ctxFrom(req));

  setAccessTokenCookie(res, result.accessToken);
  setRefreshTokenCookie(res, result.refreshToken);
  const csrfToken = issueCsrfToken(res);

  res.status(200).json({
    data: {
      accessToken: result.accessToken,
      userId: result.userId,
      sessionId: result.sessionId,
      csrfToken,
    },
  });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (req.auth) {
    await revokeSession(req.auth.userId, req.auth.sessionId);
    await recordSecurityEvent({
      event: "SESSION_REVOKED",
      userId: req.auth.userId,
      ipAddress: req.ip,
      userAgent: getUserAgent(req),
      metadata: { sessionId: req.auth.sessionId, reason: "logout" },
    });
  }
  clearAuthCookies(res);
  res.status(200).json({ data: { loggedOut: true } });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawRefreshToken = req.cookies?.[REFRESH_TOKEN_COOKIE] ?? req.body?.refreshToken;
  if (!rawRefreshToken) throw new UnauthorizedError("Refresh token missing");

  const result = await tokenService.rotateRefreshToken(rawRefreshToken, req.ip, getUserAgent(req) as string);

  const [user] = await db.select().from(users).where(eq(users.id, result.userId)).limit(1);
  if (!user || user.isDisabled) throw new UnauthorizedError("Account no longer active");

  const accessToken = signAccessToken({
    sub: user.id,
    tokenVersion: user.tokenVersion,
    sessionId: result.sessionId,
  });

  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, result.rawToken);
  const csrfToken = issueCsrfToken(res);

  res.status(200).json({ data: { accessToken, csrfToken } });
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);
  await authService.forgotPassword(email, ctxFrom(req));
  // Generic response regardless of whether the account exists.
  res.status(200).json({ data: { message: "If that email exists, a reset link has been sent." } });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(token, newPassword, ctxFrom(req));
  res.status(200).json({ data: { reset: true } });
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new UnauthorizedError();
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);
  await authService.changePassword(
    req.auth.userId,
    currentPassword,
    newPassword,
    req.auth.sessionId,
    ctxFrom(req)
  );
  res.status(200).json({ data: { changed: true } });
});
