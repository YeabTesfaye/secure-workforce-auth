import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../infrastructure/crypto/jwt.js";
import { db } from "../infrastructure/database/client.js";
import { users, sessions } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";
import { UnauthorizedError } from "../shared/errors/app-error.js";
import { ACCESS_TOKEN_COOKIE } from "../modules/auth/auth.cookies.js";
import { asyncHandler } from "../shared/utils/async-handler.js";

// Reads the access token from the httpOnly cookie (browser clients) or the
// Authorization: Bearer header (API/service clients), verifies its
// signature, then confirms the session is still valid and the user's
// tokenVersion has not been bumped since issuance (which would mean a
// password change / global logout happened after this token was minted).
export const authenticateAccessToken = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const bearer = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.slice("Bearer ".length)
      : undefined;
    const token = req.cookies?.[ACCESS_TOKEN_COOKIE] ?? bearer;

    if (!token) {
      throw new UnauthorizedError("Access token missing");
    }

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedError("Access token expired");
      }
      throw new UnauthorizedError("Invalid access token");
    }

    const [user] = await db.select().from(users).where(eq(users.id, payload.sub)).limit(1);
    if (!user || user.isDisabled) {
      throw new UnauthorizedError("Account no longer active");
    }
    if (user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError("Session has been invalidated, please log in again");
    }

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, payload.sessionId))
      .limit(1);
    if (!session || session.revoked) {
      throw new UnauthorizedError("Session has been revoked");
    }

    req.auth = { userId: user.id, sessionId: session.id };
    next();
  }
);
