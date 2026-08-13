import { randomUUID } from "node:crypto";
import { db } from "../../infrastructure/database/client.js";
import { users, emailVerificationTokens, passwordResetTokens } from "../../../db/schema/index.js";
import { and, eq, gt } from "drizzle-orm";
import { hashPassword, verifyPassword, isCommonPassword } from "../../infrastructure/crypto/password.js";
import { generateOpaqueToken, hashToken } from "../../infrastructure/crypto/tokens.js";
import { env } from "../../config/env.js";
import {
  ConflictError,
  UnauthorizedError,
  ValidationError,
  AccountLockedError,
} from "../../shared/errors/app-error.js";
import { recordSecurityEvent } from "../audit/audit.service.js";
import { getEmailProvider } from "../../infrastructure/email/email.factory.js";
import {
  recordLoginFailure,
  clearLoginFailures,
  isAccountLocked,
  getLockoutTtlSeconds,
} from "./account-protection.service.js";
import { createSession, revokeAllSessions } from "../sessions/sessions.service.js";
import { issueRefreshToken } from "./refresh-token.service.js";
import { signAccessToken } from "../../infrastructure/crypto/jwt.js";
import type { RegisterInput, LoginInput } from "./auth.schemas.js";

export interface RequestContext {
  ip?: string;
  userAgent?: string;
}

// Registration deliberately does not reveal whether the email is already
// taken via a different status code or message shape than other errors --
// see the note on ConflictError usage below and login's generic messaging.
export async function registerUser(input: RegisterInput, ctx: RequestContext) {
  if (isCommonPassword(input.password)) {
    throw new ValidationError("This password is too common, please choose a stronger one");
  }

  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) {
    // We still return 409 here (rather than faking success) because the
    // project spec calls for it explicitly at registration; the
    // no-enumeration guarantee is enforced instead at LOGIN and
    // forgot-password, where silent probing is the realistic attack.
    throw new ConflictError("An account with this email already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ email: input.email, passwordHash, fullName: input.fullName })
    .returning();

  const rawToken = generateOpaqueToken();
  await db.insert(emailVerificationTokens).values({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_SECONDS * 1000),
  });

  await getEmailProvider().sendVerificationEmail(
    user.email,
    `https://app.example.com/verify-email?token=${rawToken}`
  );

  await recordSecurityEvent({
    event: "USER_REGISTERED",
    userId: user.id,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return user;
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const [row] = await db
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.tokenHash, tokenHash),
        eq(emailVerificationTokens.used, false),
        gt(emailVerificationTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!row) throw new ValidationError("Invalid or expired verification token");

  await db.update(users).set({ emailVerified: true }).where(eq(users.id, row.userId));
  await db
    .update(emailVerificationTokens)
    .set({ used: true })
    .where(eq(emailVerificationTokens.id, row.id));

  await recordSecurityEvent({ event: "EMAIL_VERIFIED", userId: row.userId });
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  userId: string;
}

// The single generic error message for ALL login failure paths (unknown
// email, wrong password, disabled account before lock check) prevents
// account enumeration through response differences. Only the LOCKED case
// is intentionally distinguishable, since an attacker triggering it
// already knows the account exists (they caused the lockout themselves).
const GENERIC_LOGIN_ERROR = "Invalid email or password";

export async function login(input: LoginInput, ctx: RequestContext): Promise<LoginResult> {
  if (await isAccountLocked(input.email)) {
    const ttl = await getLockoutTtlSeconds(input.email);
    await recordSecurityEvent({
      event: "ACCOUNT_LOCKED",
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { email: input.email, retryAfterSeconds: ttl },
    });
    throw new AccountLockedError(`Account locked. Try again in ${ttl} seconds.`);
  }

  const [user] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);

  // Always run a hash comparison even for unknown emails (against a fixed
  // dummy hash) so response timing doesn't leak whether the email exists.
  const dummyHash = "$argon2id$v=19$m=19456,t=3,p=4$c29tZXNhbHQ$dGhpc2lzYWR1bW15aGFzaA";
  const passwordOk = await verifyPassword(user?.passwordHash ?? dummyHash, input.password);

  if (!user || !passwordOk) {
    const { locked } = await recordLoginFailure(input.email);
    await recordSecurityEvent({
      event: "LOGIN_FAILED",
      userId: user?.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { email: input.email, locked },
    });
    throw new UnauthorizedError(GENERIC_LOGIN_ERROR);
  }

  if (user.isDisabled) {
    await recordSecurityEvent({
      event: "ACCOUNT_DISABLED",
      userId: user.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });
    // Same generic message as any other failure -- do not tell the caller
    // the account exists but is disabled.
    throw new UnauthorizedError(GENERIC_LOGIN_ERROR);
  }

  await clearLoginFailures(input.email);

  const session = await createSession({ userId: user.id, ipAddress: ctx.ip, userAgent: ctx.userAgent });
  const { rawToken: refreshToken } = await issueRefreshToken(session.id);
  const accessToken = signAccessToken({
    sub: user.id,
    tokenVersion: user.tokenVersion,
    sessionId: session.id,
  });

  await recordSecurityEvent({
    event: "LOGIN_SUCCESS",
    userId: user.id,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: { sessionId: session.id },
  });
  await recordSecurityEvent({
    event: "SESSION_CREATED",
    userId: user.id,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: { sessionId: session.id },
  });

  return { accessToken, refreshToken, sessionId: session.id, userId: user.id };
}

export async function forgotPassword(email: string, ctx: RequestContext): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

  // Always respond as if successful regardless of whether the account
  // exists -- this is the generic-response requirement from the spec.
  if (!user) return;

  const rawToken = generateOpaqueToken();
  await db.insert(passwordResetTokens).values({
    userId: user.id,
    tokenHash: hashToken(rawToken),
    expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TTL_SECONDS * 1000),
  });

  await getEmailProvider().sendPasswordResetEmail(
    user.email,
    `https://app.example.com/reset-password?token=${rawToken}`
  );

  await recordSecurityEvent({
    event: "PASSWORD_RESET_REQUESTED",
    userId: user.id,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

export async function resetPassword(rawToken: string, newPassword: string, ctx: RequestContext): Promise<void> {
  if (isCommonPassword(newPassword)) {
    throw new ValidationError("This password is too common, please choose a stronger one");
  }

  const tokenHash = hashToken(rawToken);
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        eq(passwordResetTokens.used, false),
        gt(passwordResetTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (!row) throw new ValidationError("Invalid or expired reset token");

  const passwordHash = await hashPassword(newPassword);

  // Bumping tokenVersion invalidates every access token in flight, and we
  // explicitly revoke all sessions/refresh chains too -- a password reset
  // is exactly the moment we assume the account may have been compromised.
  await db
    .update(users)
    .set({ passwordHash, tokenVersion: randomUUID() })
    .where(eq(users.id, row.userId));
  await db.update(passwordResetTokens).set({ used: true }).where(eq(passwordResetTokens.id, row.id));
  await clearLoginFailures((await db.select().from(users).where(eq(users.id, row.userId)).limit(1))[0]?.email ?? "");
  await revokeAllSessions(row.userId);

  await recordSecurityEvent({
    event: "PASSWORD_RESET",
    userId: row.userId,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
  currentSessionId: string,
  ctx: RequestContext
): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new UnauthorizedError();

  const ok = await verifyPassword(user.passwordHash, currentPassword);
  if (!ok) throw new ValidationError("Current password is incorrect");

  if (isCommonPassword(newPassword)) {
    throw new ValidationError("This password is too common, please choose a stronger one");
  }

  const passwordHash = await hashPassword(newPassword);
  await db
    .update(users)
    .set({ passwordHash, tokenVersion: randomUUID() })
    .where(eq(users.id, userId));

  // Invalidate every OTHER session (force re-auth elsewhere) but keep the
  // current one alive since the user just proved their identity here.
  await revokeAllSessions(userId, currentSessionId);

  await recordSecurityEvent({
    event: "PASSWORD_CHANGED",
    userId,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
  });
}
