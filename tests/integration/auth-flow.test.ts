import { describe, it, expect } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { createApp } from "../../src/app.js";
import { db } from "../../src/infrastructure/database/client.js";
import { emailVerificationTokens } from "../../db/schema/index.js";
import { hashToken } from "../../src/infrastructure/crypto/tokens.js";
import { extractCookies, cookieHeader } from "../helpers.js";

const app = createApp();

describe("auth flow (integration)", () => {
  it("registers a user, returns 201, never leaks the password hash", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "alice@example.com", password: "CorrectHorseBattery9!" });

    expect(res.status).toBe(201);
    expect(res.body.data.email).toBe("alice@example.com");
    expect(res.body.data).not.toHaveProperty("passwordHash");
    expect(res.body.data).not.toHaveProperty("password");
  });

  it("rejects registration with a weak password", async () => {
    const res = await request(app).post("/auth/register").send({ email: "weak@example.com", password: "short" });
    expect(res.status).toBe(400);
  });

  it("rejects duplicate registration with 409", async () => {
    await request(app).post("/auth/register").send({ email: "dupe@example.com", password: "CorrectHorseBattery9!" });
    const res = await request(app)
      .post("/auth/register")
      .send({ email: "dupe@example.com", password: "CorrectHorseBattery9!" });
    expect(res.status).toBe(409);
  });

  it("full flow: register -> verify -> login -> access /users/me -> refresh -> logout", async () => {
    const email = "flow@example.com";
    const password = "CorrectHorseBattery9!";

    await request(app).post("/auth/register").send({ email, password });

    const [tokenRow] = await db.select().from(emailVerificationTokens);
    // We only have the hash in the DB (by design); reconstruct isn't
    // possible, so for this test we mint a token, hash it, and overwrite
    // the stored row -- simulating "the user clicked the emailed link".
    const rawToken = "test-raw-verification-token-value";
    await db
      .update(emailVerificationTokens)
      .set({ tokenHash: hashToken(rawToken) })
      .where(eq(emailVerificationTokens.id, tokenRow.id));

    const verifyRes = await request(app).post("/auth/verify-email").send({ token: rawToken });
    expect(verifyRes.status).toBe(200);

    const loginRes = await request(app).post("/auth/login").send({ email, password });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.accessToken).toBeTruthy();

    const cookies = extractCookies(loginRes);
    expect(cookies.access_token).toBeTruthy();
    expect(cookies.refresh_token).toBeTruthy();
    expect(cookies.csrf_token).toBeTruthy();

    const meRes = await request(app).get("/users/me").set("Cookie", cookieHeader(cookies));
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(email);

    const refreshRes = await request(app).post("/auth/refresh").set("Cookie", cookieHeader(cookies));
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeTruthy();

    const newCookies = extractCookies(refreshRes);
    const logoutRes = await request(app)
      .post("/auth/logout")
      .set("Cookie", cookieHeader({ ...cookies, ...newCookies }))
      .set("x-csrf-token", newCookies.csrf_token ?? cookies.csrf_token);
    expect(logoutRes.status).toBe(200);
  });

  it("rejects login with wrong password using a generic error", async () => {
    const email = "generic@example.com";
    await request(app).post("/auth/register").send({ email, password: "CorrectHorseBattery9!" });

    const res = await request(app).post("/auth/login").send({ email, password: "WrongPassword9!" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });

  it("returns the same generic error for a nonexistent email as for a wrong password", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: "doesnotexist@example.com", password: "WhateverPassword9!" });
    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe("Invalid email or password");
  });
});
