import { db } from "../../infrastructure/database/client.js";
import { sessions, refreshTokens } from "../../../db/schema/index.js";
import { and, eq } from "drizzle-orm";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/app-error.js";

export interface CreateSessionInput {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

// Best-effort, dependency-free device label parsing. Good enough for a
// "Chrome on macOS" style label in the sessions list; not a full UA parser.
function labelFromUserAgent(ua?: string): string {
  if (!ua) return "Unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Unknown browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Mac OS X/.test(ua)
      ? "macOS"
      : /Android/.test(ua)
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : "Unknown OS";
  return `${browser} on ${os}`;
}

export async function createSession(input: CreateSessionInput) {
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_SECONDS * 1000);
  const [session] = await db
    .insert(sessions)
    .values({
      userId: input.userId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      deviceLabel: labelFromUserAgent(input.userAgent),
      expiresAt,
    })
    .returning();
  return session;
}

export async function touchSession(sessionId: string) {
  await db.update(sessions).set({ lastActiveAt: new Date() }).where(eq(sessions.id, sessionId));
}

export async function listSessions(userId: string) {
  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, userId), eq(sessions.revoked, false)));
}

export async function revokeSession(userId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, userId)))
    .limit(1);
  if (!session) throw new NotFoundError("Session not found");

  await db
    .update(sessions)
    .set({ revoked: true, revokedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  // Revoking a session must also kill any not-yet-used refresh token in its
  // family, or the device could keep refreshing despite the "revoked" session.
  await db
    .update(refreshTokens)
    .set({ revoked: true, revokedAt: new Date() })
    .where(and(eq(refreshTokens.sessionId, sessionId), eq(refreshTokens.used, false)));
}

export async function revokeAllSessions(userId: string, exceptSessionId?: string) {
  const userSessions = await listSessions(userId);
  for (const session of userSessions) {
    if (session.id === exceptSessionId) continue;
    await revokeSession(userId, session.id);
  }
}
