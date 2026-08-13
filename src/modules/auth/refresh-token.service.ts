import { randomUUID } from "node:crypto";
import { db } from "../../infrastructure/database/client.js";
import { refreshTokens, sessions } from "../../../db/schema/index.js";
import { and, eq } from "drizzle-orm";
import { generateOpaqueToken, hashToken } from "../../infrastructure/crypto/tokens.js";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../shared/errors/app-error.js";
import { recordSecurityEvent } from "../audit/audit.service.js";

export interface IssuedRefreshToken {
  rawToken: string;
  familyId: string;
  tokenId: string;
}

// Issues the FIRST refresh token in a new rotation family (i.e. at login).
export async function issueRefreshToken(sessionId: string): Promise<IssuedRefreshToken> {
  const rawToken = generateOpaqueToken();
  const familyId = randomUUID();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000);

  const [row] = await db
    .insert(refreshTokens)
    .values({
      sessionId,
      familyId,
      tokenHash: hashToken(rawToken),
      expiresAt,
    })
    .returning();

  return { rawToken, familyId, tokenId: row.id };
}

export interface RotationResult {
  rawToken: string;
  sessionId: string;
  userId: string;
}

/**
 * REFRESH TOKEN ROTATION + REUSE DETECTION
 * ---------------------------------------------------------------------
 * Every refresh consumes the presented token and issues a brand new one
 * in the same family. The presented token's row is marked `used`.
 *
 * If a token is presented that is already `used` or `revoked`, that is
 * conclusive evidence the token was stolen and used by two different
 * parties (the legitimate client already rotated past it, or the family
 * was explicitly revoked). We respond by revoking the ENTIRE family and
 * the session it belongs to -- not just the one token -- which forces
 * both the attacker and the legitimate user to re-authenticate. This is
 * the standard mitigation for the "stolen refresh token" threat.
 */
export async function rotateRefreshToken(rawToken: string, ip?: string, ua?: string): Promise<RotationResult> {
  const tokenHash = hashToken(rawToken);

  const [presented] = await db
    .select()
    .from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!presented) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const [session] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, presented.sessionId))
    .limit(1);

  if (presented.used || presented.revoked || !session || session.revoked) {
    // Reuse (or use-after-revocation) detected. Nuke the whole family.
    await db
      .update(refreshTokens)
      .set({ revoked: true, revokedAt: new Date() })
      .where(and(eq(refreshTokens.familyId, presented.familyId), eq(refreshTokens.revoked, false)));

    if (session) {
      await db
        .update(sessions)
        .set({ revoked: true, revokedAt: new Date() })
        .where(eq(sessions.id, session.id));
    }

    await recordSecurityEvent({
      event: "REFRESH_TOKEN_REUSE_DETECTED",
      userId: session?.userId,
      ipAddress: ip,
      userAgent: ua,
      metadata: { familyId: presented.familyId, sessionId: presented.sessionId },
    });

    throw new UnauthorizedError("Refresh token reuse detected, session revoked");
  }

  if (presented.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token expired");
  }

  const newRawToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000);

  const [newRow] = await db
    .insert(refreshTokens)
    .values({
      sessionId: presented.sessionId,
      familyId: presented.familyId,
      tokenHash: hashToken(newRawToken),
      expiresAt,
    })
    .returning();

  await db
    .update(refreshTokens)
    .set({ used: true, usedAt: new Date(), replacedByTokenId: newRow.id })
    .where(eq(refreshTokens.id, presented.id));

  await db
    .update(sessions)
    .set({ lastActiveAt: new Date() })
    .where(eq(sessions.id, presented.sessionId));

  await recordSecurityEvent({
    event: "REFRESH_TOKEN_ROTATED",
    userId: session.userId,
    ipAddress: ip,
    userAgent: ua,
    metadata: { familyId: presented.familyId, sessionId: presented.sessionId },
  });

  return { rawToken: newRawToken, sessionId: presented.sessionId, userId: session.userId };
}

export async function revokeTokenFamilyBySession(sessionId: string) {
  await db
    .update(refreshTokens)
    .set({ revoked: true, revokedAt: new Date() })
    .where(and(eq(refreshTokens.sessionId, sessionId), eq(refreshTokens.used, false)));
}
