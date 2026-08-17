import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { extractCookies, cookieHeader } from "../helpers.js";

const app = createApp();

async function registerAndLogin(email: string, password = "CorrectHorseBattery9!") {
  await request(app).post("/auth/register").send({ email, password });
  const res = await request(app).post("/auth/login").send({ email, password });
  const cookies = extractCookies(res);
  return { cookies, header: cookieHeader(cookies), accessToken: res.body.data.accessToken as string };
}

describe("session and device management (security)", () => {
  it("lists active sessions with metadata and flags the current one", async () => {
    const email = "sessions-list@example.com";
    const password = "CorrectHorseBattery9!";
    await request(app).post("/auth/register").send({ email, password });
    const loginRes = await request(app)
      .post("/auth/login")
      .set("User-Agent", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) Chrome/120.0")
      .send({ email, password });
    const cookies = extractCookies(loginRes);

    const res = await request(app).get("/sessions").set("Cookie", cookieHeader(cookies));
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const current = res.body.data.find((s: { isCurrent: boolean }) => s.isCurrent);
    expect(current).toBeTruthy();
    expect(current.deviceLabel).toContain("Chrome");
    expect(current).toHaveProperty("ipAddress");
    expect(current).toHaveProperty("lastActiveAt");
    expect(current).toHaveProperty("createdAt");
  });

  it("a second login creates a second, independent session", async () => {
    const email = "sessions-multi@example.com";
    const password = "CorrectHorseBattery9!";
    await request(app).post("/auth/register").send({ email, password });

    const first = extractCookies(await request(app).post("/auth/login").send({ email, password }));
    const second = extractCookies(await request(app).post("/auth/login").send({ email, password }));

    const res = await request(app).get("/sessions").set("Cookie", cookieHeader(second));
    expect(res.body.data.length).toBe(2);

    // Only one is flagged current -- from the perspective of the SECOND login.
    const currentOnes = res.body.data.filter((s: { isCurrent: boolean }) => s.isCurrent);
    expect(currentOnes.length).toBe(1);
    void first;
  });

  it("revoking the current session logs the user out immediately", async () => {
    const user = await registerAndLogin("sessions-revoke-current@example.com");

    const list = await request(app).get("/sessions").set("Cookie", user.header);
    const currentSessionId = list.body.data.find((s: { isCurrent: boolean }) => s.isCurrent).id;

    const revokeRes = await request(app)
      .delete(`/sessions/${currentSessionId}`)
      .set("Cookie", user.header)
      .set("x-csrf-token", user.cookies.csrf_token);
    expect(revokeRes.status).toBe(200);

    const afterRes = await request(app).get("/users/me").set("Cookie", user.header);
    expect(afterRes.status).toBe(401);
  });

  it("revoking one OTHER session leaves the current session usable", async () => {
    const email = "sessions-revoke-other@example.com";
    const password = "CorrectHorseBattery9!";
    await request(app).post("/auth/register").send({ email, password });

    const deviceA = extractCookies(await request(app).post("/auth/login").send({ email, password }));
    const deviceB = extractCookies(await request(app).post("/auth/login").send({ email, password }));

    const listAsB = await request(app).get("/sessions").set("Cookie", cookieHeader(deviceB));
    const sessionA = listAsB.body.data.find((s: { isCurrent: boolean }) => !s.isCurrent);

    const revokeRes = await request(app)
      .delete(`/sessions/${sessionA.id}`)
      .set("Cookie", cookieHeader(deviceB))
      .set("x-csrf-token", deviceB.csrf_token);
    expect(revokeRes.status).toBe(200);

    // Device B (the one that issued the revoke) is still logged in.
    const meAsB = await request(app).get("/users/me").set("Cookie", cookieHeader(deviceB));
    expect(meAsB.status).toBe(200);

    // Device A is now dead.
    const meAsA = await request(app).get("/users/me").set("Cookie", cookieHeader(deviceA));
    expect(meAsA.status).toBe(401);
  });

  it("DELETE /sessions/all revokes every OTHER session but keeps the caller logged in", async () => {
    const email = "sessions-revoke-all@example.com";
    const password = "CorrectHorseBattery9!";
    await request(app).post("/auth/register").send({ email, password });

    const deviceA = extractCookies(await request(app).post("/auth/login").send({ email, password }));
    const deviceB = extractCookies(await request(app).post("/auth/login").send({ email, password }));
    const deviceC = extractCookies(await request(app).post("/auth/login").send({ email, password }));

    const res = await request(app)
      .delete("/sessions/all")
      .set("Cookie", cookieHeader(deviceC))
      .set("x-csrf-token", deviceC.csrf_token);
    expect(res.status).toBe(200);

    const meAsC = await request(app).get("/users/me").set("Cookie", cookieHeader(deviceC));
    expect(meAsC.status).toBe(200);

    const meAsA = await request(app).get("/users/me").set("Cookie", cookieHeader(deviceA));
    expect(meAsA.status).toBe(401);
    const meAsB = await request(app).get("/users/me").set("Cookie", cookieHeader(deviceB));
    expect(meAsB.status).toBe(401);
  });

  it("a revoked session's refresh token can no longer be used either", async () => {
    const user = await registerAndLogin("sessions-revoke-refresh@example.com");

    const list = await request(app).get("/sessions").set("Cookie", user.header);
    const sessionId = list.body.data[0].id;

    await request(app)
      .delete(`/sessions/${sessionId}`)
      .set("Cookie", user.header)
      .set("x-csrf-token", user.cookies.csrf_token);

    const refreshRes = await request(app).post("/auth/refresh").set("Cookie", user.header);
    expect(refreshRes.status).toBe(401);
  });

  it("one user cannot revoke another user's session by guessing its ID", async () => {
    const victim = await registerAndLogin("session-victim@example.com");
    const attacker = await registerAndLogin("session-attacker@example.com");

    const victimSessions = await request(app).get("/sessions").set("Cookie", victim.header);
    const victimSessionId = victimSessions.body.data[0].id;

    const res = await request(app)
      .delete(`/sessions/${victimSessionId}`)
      .set("Cookie", attacker.header)
      .set("x-csrf-token", attacker.cookies.csrf_token);
    // The lookup is scoped by (sessionId AND userId=caller), so a
    // cross-user ID does not resolve -- same 404 as any nonexistent ID,
    // which avoids confirming the session ID was even valid.
    expect(res.status).toBe(404);

    // Confirm it's genuinely still alive from the victim's side.
    const stillWorks = await request(app).get("/users/me").set("Cookie", victim.header);
    expect(stillWorks.status).toBe(200);
  });

  it("a nonexistent session ID returns 404, not a crash", async () => {
    const user = await registerAndLogin("sessions-nonexistent@example.com");
    const res = await request(app)
      .delete("/sessions/11111111-1111-1111-1111-111111111111")
      .set("Cookie", user.header)
      .set("x-csrf-token", user.cookies.csrf_token);
    expect(res.status).toBe(404);
  });
});
