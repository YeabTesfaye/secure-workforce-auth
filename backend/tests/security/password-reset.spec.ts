import { describe, it, expect } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { createApp } from "../../src/app.js";
import { db } from "../../src/infrastructure/database/client.js";
import { passwordResetTokens, users } from "../../db/schema/index.js";
import { hashToken } from "../../src/infrastructure/crypto/tokens.js";
import { extractCookies, cookieHeader } from "../helpers.js";

const app = createApp();

// Reset tokens are only ever stored as a hash (see docs/security.md), so
// tests can't recover the raw value the "email" would have contained.
// This mints a known raw value, overwrites the stored hash to match it,
// and treats that as "the value the user clicked in their email" --
// the same technique used for email verification in auth-flow.test.ts.
async function mintKnownResetToken(email: string): Promise<string> {
  await request(app).post("/auth/forgot-password").send({ email });
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const [tokenRow] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.userId, user.id));

  const rawToken = `known-reset-token-${Date.now()}-${Math.random()}`;
  await db
    .update(passwordResetTokens)
    .set({ tokenHash: hashToken(rawToken) })
    .where(eq(passwordResetTokens.id, tokenRow.id));

  return rawToken;
}

describe("password reset token security (security)", () => {
  it("returns the same generic response whether or not the email exists (no enumeration)", async () => {
    const knownEmail = "reset-known@example.com";
    await request(app).post("/auth/register").send({ email: knownEmail, password: "CorrectHorseBattery9!" });

    const knownRes = await request(app).post("/auth/forgot-password").send({ email: knownEmail });
    const unknownRes = await request(app)
      .post("/auth/forgot-password")
      .send({ email: "definitely-not-registered@example.com" });

    expect(knownRes.status).toBe(200);
    expect(unknownRes.status).toBe(200);
    expect(knownRes.body.data.message).toEqual(unknownRes.body.data.message);
  });

  it("a valid reset token successfully changes the password", async () => {
    const email = "reset-success@example.com";
    await request(app).post("/auth/register").send({ email, password: "OldPassword123!" });
    const rawToken = await mintKnownResetToken(email);

    const resetRes = await request(app)
      .post("/auth/reset-password")
      .send({ token: rawToken, newPassword: "NewPassword456!" });
    expect(resetRes.status).toBe(200);

    const loginOld = await request(app).post("/auth/login").send({ email, password: "OldPassword123!" });
    expect(loginOld.status).toBe(401);

    const loginNew = await request(app).post("/auth/login").send({ email, password: "NewPassword456!" });
    expect(loginNew.status).toBe(200);
  });

  it("SINGLE-USE: a reset token cannot be used twice", async () => {
    const email = "reset-single-use@example.com";
    await request(app).post("/auth/register").send({ email, password: "OldPassword123!" });
    const rawToken = await mintKnownResetToken(email);

    const first = await request(app)
      .post("/auth/reset-password")
      .send({ token: rawToken, newPassword: "NewPassword456!" });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post("/auth/reset-password")
      .send({ token: rawToken, newPassword: "AnotherPassword789!" });
    expect(second.status).toBe(400);
  });

  it("an expired reset token is rejected", async () => {
    const email = "reset-expired@example.com";
    await request(app).post("/auth/register").send({ email, password: "OldPassword123!" });
    const rawToken = await mintKnownResetToken(email);

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    await db
      .update(passwordResetTokens)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(passwordResetTokens.userId, user.id));

    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token: rawToken, newPassword: "NewPassword456!" });
    expect(res.status).toBe(400);
  });

  it("rejects an unknown/garbage reset token", async () => {
    const res = await request(app)
      .post("/auth/reset-password")
      .send({ token: "garbage-token-that-was-never-issued", newPassword: "NewPassword456!" });
    expect(res.status).toBe(400);
  });

  it("resetting the password invalidates every existing session", async () => {
    const email = "reset-invalidates-sessions@example.com";
    const password = "OldPassword123!";
    await request(app).post("/auth/register").send({ email, password });

    const loginRes = await request(app).post("/auth/login").send({ email, password });
    const cookies = extractCookies(loginRes);

    const rawToken = await mintKnownResetToken(email);
    await request(app).post("/auth/reset-password").send({ token: rawToken, newPassword: "NewPassword456!" });

    const res = await request(app).get("/users/me").set("Cookie", cookieHeader(cookies));
    expect(res.status).toBe(401);
  });

  it("rejects a new password that fails complexity or common-password checks", async () => {
    const email = "reset-weak-password@example.com";
    await request(app).post("/auth/register").send({ email, password: "OldPassword123!" });
    const rawToken = await mintKnownResetToken(email);

    const res = await request(app).post("/auth/reset-password").send({ token: rawToken, newPassword: "short" });
    expect(res.status).toBe(400);
  });
});