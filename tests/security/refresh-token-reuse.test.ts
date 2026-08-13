import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { extractCookies, cookieHeader } from "../helpers.js";
import { db } from "../../src/infrastructure/database/client.js";
import { auditLogs } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";

const app = createApp();

describe("refresh token rotation and reuse detection (security)", () => {
  it("rotates the refresh token on every use, invalidating the previous one", async () => {
    const email = "rotate@example.com";
    await request(app).post("/auth/register").send({ email, password: "CorrectHorseBattery9!" });
    const loginRes = await request(app).post("/auth/login").send({ email, password: "CorrectHorseBattery9!" });
    const cookies = extractCookies(loginRes);

    const firstRefresh = await request(app).post("/auth/refresh").set("Cookie", cookieHeader(cookies));
    expect(firstRefresh.status).toBe(200);
    const rotatedCookies = extractCookies(firstRefresh);
    expect(rotatedCookies.refresh_token).toBeTruthy();
    expect(rotatedCookies.refresh_token).not.toEqual(cookies.refresh_token);

    // Using the SAME (now-old) refresh token again must fail.
    const reuseAttempt = await request(app).post("/auth/refresh").set("Cookie", cookieHeader(cookies));
    expect(reuseAttempt.status).toBe(401);
  });

  it("REUSE DETECTION: presenting an already-used refresh token revokes the entire session/family", async () => {
    const email = "reuse@example.com";
    await request(app).post("/auth/register").send({ email, password: "CorrectHorseBattery9!" });
    const loginRes = await request(app).post("/auth/login").send({ email, password: "CorrectHorseBattery9!" });
    const originalCookies = extractCookies(loginRes);

    // Legitimate client rotates once.
    const legitRefresh = await request(app).post("/auth/refresh").set("Cookie", cookieHeader(originalCookies));
    const newCookies = extractCookies(legitRefresh);
    expect(legitRefresh.status).toBe(200);

    // Attacker (who stole the ORIGINAL token before rotation) replays it.
    const attackerReplay = await request(app)
      .post("/auth/refresh")
      .set("Cookie", cookieHeader(originalCookies));
    expect(attackerReplay.status).toBe(401);

    const event = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.event, "REFRESH_TOKEN_REUSE_DETECTED"));
    expect(event.length).toBeGreaterThanOrEqual(1);

    // Because the family (and session) was revoked on reuse detection, even
    // the LEGITIMATE client's newly rotated token must now be rejected --
    // this is the "kill the whole family" containment behavior.
    const legitTriesAgain = await request(app).post("/auth/refresh").set("Cookie", cookieHeader(newCookies));
    expect(legitTriesAgain.status).toBe(401);
  });

  it("rejects a refresh token with an invalid/unknown value", async () => {
    const res = await request(app).post("/auth/refresh").set("Cookie", "refresh_token=not-a-real-token");
    expect(res.status).toBe(401);
  });
});
