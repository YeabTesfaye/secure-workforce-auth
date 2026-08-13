import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { extractCookies, cookieHeader } from "../helpers.js";

const app = createApp();

describe("CSRF protection (security)", () => {
  it("rejects a cookie-authenticated mutation missing the CSRF header", async () => {
    const email = "csrf@example.com";
    await request(app).post("/auth/register").send({ email, password: "CorrectHorseBattery9!" });
    const loginRes = await request(app).post("/auth/login").send({ email, password: "CorrectHorseBattery9!" });
    const cookies = extractCookies(loginRes);

    // Attempt logout with valid session cookies but NO x-csrf-token header,
    // simulating a cross-site form POST that rides the ambient cookie jar.
    const res = await request(app).post("/auth/logout").set("Cookie", cookieHeader(cookies));
    expect(res.status).toBe(403);
  });

  it("rejects a mutation where the CSRF header does not match the cookie", async () => {
    const email = "csrf2@example.com";
    await request(app).post("/auth/register").send({ email, password: "CorrectHorseBattery9!" });
    const loginRes = await request(app).post("/auth/login").send({ email, password: "CorrectHorseBattery9!" });
    const cookies = extractCookies(loginRes);

    const res = await request(app)
      .post("/auth/logout")
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", "attacker-guessed-value");
    expect(res.status).toBe(403);
  });

  it("allows the mutation when the CSRF header matches the cookie", async () => {
    const email = "csrf3@example.com";
    await request(app).post("/auth/register").send({ email, password: "CorrectHorseBattery9!" });
    const loginRes = await request(app).post("/auth/login").send({ email, password: "CorrectHorseBattery9!" });
    const cookies = extractCookies(loginRes);

    const res = await request(app)
      .post("/auth/logout")
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", cookies.csrf_token);
    expect(res.status).toBe(200);
  });

  it("exempts Bearer-token clients from CSRF (not cookie-authenticated)", async () => {
    const email = "csrf4@example.com";
    await request(app).post("/auth/register").send({ email, password: "CorrectHorseBattery9!" });
    const loginRes = await request(app).post("/auth/login").send({ email, password: "CorrectHorseBattery9!" });

    const res = await request(app)
      .post("/auth/logout")
      .set("Authorization", `Bearer ${loginRes.body.data.accessToken}`);
    expect(res.status).toBe(200);
  });
});
