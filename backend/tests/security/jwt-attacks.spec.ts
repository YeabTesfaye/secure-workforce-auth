import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app.js";
import { seedPermissionCatalog, extractCookies, cookieHeader } from "../helpers.js";
import { env } from "../../src/config/env.js";

const app = createApp();

async function registerAndLogin(email: string, password = "CorrectHorseBattery9!") {
  await request(app).post("/auth/register").send({ email, password });
  const res = await request(app).post("/auth/login").send({ email, password });
  const cookies = extractCookies(res);
  return { cookies, header: cookieHeader(cookies), accessToken: res.body.data.accessToken };
}

/**
 * JWT attack vectors that a real attacker might try. Each test proves the
 * server rejects the tampered token rather than accepting it.
 */
describe("JWT attack vectors (security)", () => {
  beforeEach(async () => {
    await seedPermissionCatalog();
  });

  it("rejects a token signed with 'none' algorithm", async () => {
    const { accessToken } = await registerAndLogin("none-alg@example.com");

    // Decode the real token to get the payload, then re-sign with 'none'
    const payload = jwt.decode(accessToken) as jwt.JwtPayload;
    const forged = jwt.sign(payload, "", { algorithm: "none" });

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with a wrong secret", async () => {
    const { accessToken } = await registerAndLogin("wrong-secret@example.com");

    const payload = jwt.decode(accessToken) as jwt.JwtPayload;
    const forged = jwt.sign(payload, "completely-wrong-secret-that-is-long-enough-32chars!!", {
      algorithm: "HS256",
    });

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token with tampered payload (changed sub)", async () => {
    const attacker = await registerAndLogin("attacker-payload@example.com");
    const victim = await registerAndLogin("victim-payload@example.com");

    // Decode attacker's token, change sub to victim's userId, re-sign with attacker's knowledge
    const payload = jwt.decode(attacker.accessToken) as jwt.JwtPayload;
    const tamperedPayload = { ...payload, sub: victim.accessToken ? jwt.decode(victim.accessToken)?.sub : "unknown" };
    const forged = jwt.sign(tamperedPayload, env.JWT_ACCESS_SECRET, { algorithm: "HS256" });

    // The forged token has victim's sub but attacker's tokenVersion,
    // which won't match victim's tokenVersion, so it should be rejected.
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${forged}`);
    // Should be 401 because tokenVersion won't match
    expect(res.status).toBe(401);
  });

  it("rejects a token with alg header changed to RS256 (algorithm confusion)", async () => {
    const { accessToken } = await registerAndLogin("alg-confusion@example.com");

    // Try to manipulate the header to use RS256 with the HMAC secret as the key
    const parts = accessToken.split(".");
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    header.alg = "RS256";
    const tamperedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");

    // The signature is garbage now, but the point is the server should reject
    const forged = `${tamperedHeader}.${parts[1]}.${parts[2]}`;

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it("rejects a completely fabricated token", async () => {
    const res = await request(app)
      .get("/users/me")
      .set("Authorization", "Bearer totally.not.a.real.jwt.token");
    expect(res.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const { accessToken } = await registerAndLogin("expired-token@example.com");

    const payload = jwt.decode(accessToken) as jwt.JwtPayload;
    // Create a token that expired 1 hour ago
    const expired = jwt.sign(
      { ...payload, iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 },
      env.JWT_ACCESS_SECRET,
      { algorithm: "HS256" }
    );

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.message).toContain("expired");
  });

  it("rejects a token with no Bearer prefix", async () => {
    const { accessToken } = await registerAndLogin("no-bearer@example.com");

    const res = await request(app)
      .get("/users/me")
      .set("Authorization", accessToken);
    expect(res.status).toBe(401);
  });
});
