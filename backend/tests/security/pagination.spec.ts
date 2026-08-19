import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { seedPermissionCatalog, extractCookies, cookieHeader } from "../helpers.js";

const app = createApp();

async function registerAndLogin(email: string, password = "CorrectHorseBattery9!") {
  await request(app).post("/auth/register").send({ email, password });
  const res = await request(app).post("/auth/login").send({ email, password });
  const cookies = extractCookies(res);
  return { cookies, header: cookieHeader(cookies) };
}

describe("Pagination security", () => {
  beforeEach(async () => {
    await seedPermissionCatalog();
  });

  it("rejects negative page number", async () => {
    const { header } = await registerAndLogin("neg-page@example.com");
    const res = await request(app)
      .get("/organizations")
      .set("Cookie", header)
      .query({ page: -1 });
    expect(res.status).toBe(400);
  });

  it("rejects page=0", async () => {
    const { header } = await registerAndLogin("zero-page@example.com");
    const res = await request(app)
      .get("/organizations")
      .set("Cookie", header)
      .query({ page: 0 });
    expect(res.status).toBe(400);
  });

  it("rejects negative limit", async () => {
    const { header } = await registerAndLogin("neg-limit@example.com");
    const res = await request(app)
      .get("/organizations")
      .set("Cookie", header)
      .query({ limit: -5 });
    expect(res.status).toBe(400);
  });

  it("caps limit at 100 even if larger value is requested", async () => {
    const { header } = await registerAndLogin("big-limit@example.com");
    const res = await request(app)
      .get("/organizations")
      .set("Cookie", header)
      .query({ limit: 1000 });
    // Should succeed but cap at 100
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(100);
  });

  it("returns pagination metadata in response", async () => {
    const { header } = await registerAndLogin("meta-page@example.com");
    const res = await request(app)
      .get("/organizations")
      .set("Cookie", header)
      .query({ page: 1, limit: 10 });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("pagination");
    expect(res.body.pagination).toHaveProperty("page");
    expect(res.body.pagination).toHaveProperty("limit");
    expect(res.body.pagination).toHaveProperty("total");
  });

  it("handles non-numeric page/limit gracefully", async () => {
    const { header } = await registerAndLogin("nan-page@example.com");
    const res = await request(app)
      .get("/organizations")
      .set("Cookie", header)
      .query({ page: "abc", limit: "xyz" });
    // Should either use defaults or return 400
    expect([200, 400]).toContain(res.status);
  });
});
