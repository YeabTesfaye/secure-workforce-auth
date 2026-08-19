import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { seedPermissionCatalog, extractCookies, cookieHeader } from "../helpers.js";

const app = createApp();

describe("Cookie security attributes", () => {
  beforeEach(async () => {
    await seedPermissionCatalog();
  });

  it("sets HttpOnly on access_token cookie", async () => {
    await request(app).post("/auth/register").send({
      email: "httponly-test@example.com",
      password: "CorrectHorseBattery9!",
    });
    const res = await request(app).post("/auth/login").send({
      email: "httponly-test@example.com",
      password: "CorrectHorseBattery9!",
    });

    const setCookieHeaders = res.headers["set-cookie"] as unknown as string[];
    const accessCookie = setCookieHeaders?.find((c) => c.startsWith("access_token="));
    expect(accessCookie).toBeDefined();
    expect(accessCookie!.toLowerCase()).toContain("httponly");
  });

  it("sets SameSite on access_token cookie", async () => {
    await request(app).post("/auth/register").send({
      email: "samesite-test@example.com",
      password: "CorrectHorseBattery9!",
    });
    const res = await request(app).post("/auth/login").send({
      email: "samesite-test@example.com",
      password: "CorrectHorseBattery9!",
    });

    const setCookieHeaders = res.headers["set-cookie"] as unknown as string[];
    const accessCookie = setCookieHeaders?.find((c) => c.startsWith("access_token="));
    expect(accessCookie).toBeDefined();
    expect(accessCookie!.toLowerCase()).toContain("samesite");
  });

  it("sets HttpOnly on refresh_token cookie", async () => {
    await request(app).post("/auth/register").send({
      email: "refresh-httponly@example.com",
      password: "CorrectHorseBattery9!",
    });
    const res = await request(app).post("/auth/login").send({
      email: "refresh-httponly@example.com",
      password: "CorrectHorseBattery9!",
    });

    const setCookieHeaders = res.headers["set-cookie"] as unknown as string[];
    const refreshCookie = setCookieHeaders?.find((c) => c.startsWith("refresh_token="));
    expect(refreshCookie).toBeDefined();
    expect(refreshCookie!.toLowerCase()).toContain("httponly");
  });

  it("clears cookies on logout", async () => {
    await request(app).post("/auth/register").send({
      email: "logout-clear@example.com",
      password: "CorrectHorseBattery9!",
    });
    const loginRes = await request(app).post("/auth/login").send({
      email: "logout-clear@example.com",
      password: "CorrectHorseBattery9!",
    });
    const cookies = extractCookies(loginRes);

    const logoutRes = await request(app)
      .post("/auth/logout")
      .set("Cookie", cookieHeader(cookies));

    const setCookieHeaders = logoutRes.headers["set-cookie"] as unknown as string[];
    const accessCookie = setCookieHeaders?.find((c) => c.startsWith("access_token="));
    expect(accessCookie).toBeDefined();
    // Should have Max-Age=0 or Expires in the past to clear
    expect(accessCookie!.toLowerCase()).toMatch(/(max-age=0|expires=)/);
  });
});

describe("Health endpoint", () => {
  it("returns 200 with correct shape", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("timestamp");
  });
});
