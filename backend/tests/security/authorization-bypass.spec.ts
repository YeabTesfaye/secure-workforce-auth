import { describe, it, expect } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import { createApp } from "../../src/app.js";
import { seedPermissionCatalog, extractCookies, cookieHeader } from "../helpers.js";
import { db } from "../../src/infrastructure/database/client.js";
import { users } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";

const app = createApp();

async function registerAndLogin(email: string, password = "CorrectHorseBattery9!") {
  await request(app).post("/auth/register").send({ email, password });
  const res = await request(app).post("/auth/login").send({ email, password });
  const cookies = extractCookies(res);
  return { cookies, header: cookieHeader(cookies), userId: res.body.data.userId as string };
}

describe("authentication/authorization bypass attempts (security)", () => {
  it("rejects requests with no access token at all", async () => {
    const res = await request(app).get("/users/me");
    expect(res.status).toBe(401);
  });

  it("rejects a syntactically invalid / tampered access token", async () => {
    const res = await request(app).get("/users/me").set("Cookie", "access_token=not.a.real.jwt");
    expect(res.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret (forged token)", async () => {
    const forged = jwt.sign(
      { sub: "00000000-0000-0000-0000-000000000000", tokenVersion: "x", sessionId: "y" },
      "attacker-controlled-secret-that-is-at-least-32-chars"
    );
    const res = await request(app).get("/users/me").set("Cookie", `access_token=${forged}`);
    expect(res.status).toBe(401);
  });

  it("rejects a token for a userId that doesn't exist (deleted/nonexistent account)", async () => {
    const forged = jwt.sign(
      { sub: "00000000-0000-0000-0000-000000000000", tokenVersion: "x", sessionId: "y" },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: 900, issuer: "secure-workforce-auth" }
    );
    const res = await request(app).get("/users/me").set("Cookie", `access_token=${forged}`);
    expect(res.status).toBe(401);
  });

  it("rejects an access token whose tokenVersion no longer matches the user (post password-change replay)", async () => {
    const email = "tokenversion-bypass@example.com";
    const password = "CorrectHorseBattery9!";
    await request(app).post("/auth/register").send({ email, password });
    const loginRes = await request(app).post("/auth/login").send({ email, password });
    const staleAccessToken = loginRes.body.data.accessToken as string;
    const cookies = extractCookies(loginRes);

    // Change password -- this bumps tokenVersion server-side.
    await request(app)
      .post("/auth/change-password")
      .set("Cookie", cookieHeader(cookies))
      .set("x-csrf-token", cookies.csrf_token)
      .send({ currentPassword: password, newPassword: "NewCorrectHorseBattery9!" });

    // The OLD access token is unexpired and cryptographically valid, but
    // must still be rejected because it was minted before the version bump.
    const res = await request(app).get("/users/me").set("Authorization", `Bearer ${staleAccessToken}`);
    expect(res.status).toBe(401);
  });

  it("rejects an access token belonging to a revoked session", async () => {
    const email = "revoked-session-bypass@example.com";
    const password = "CorrectHorseBattery9!";
    await request(app).post("/auth/register").send({ email, password });
    const loginRes = await request(app).post("/auth/login").send({ email, password });
    const accessToken = loginRes.body.data.accessToken as string;

    const sessionsRes = await request(app).get("/sessions").set("Authorization", `Bearer ${accessToken}`);
    const sessionId = sessionsRes.body.data[0].id;

    await request(app).delete(`/sessions/${sessionId}`).set("Authorization", `Bearer ${accessToken}`);

    const res = await request(app).get("/users/me").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(401);
  });

  it("rejects requests from a disabled account even with a valid, unexpired token", async () => {
    const email = "disabled-bypass@example.com";
    const password = "CorrectHorseBattery9!";
    await request(app).post("/auth/register").send({ email, password });
    const loginRes = await request(app).post("/auth/login").send({ email, password });
    const accessToken = loginRes.body.data.accessToken as string;

    await db.update(users).set({ isDisabled: true }).where(eq(users.email, email));

    const res = await request(app).get("/users/me").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(401);
  });

  it("privilege escalation: a caller without a permission cannot perform the gated action even by calling the route directly", async () => {
    await seedPermissionCatalog();
    const owner = await registerAndLogin("owner-priv-esc@example.com");
    const employee = await registerAndLogin("employee-priv-esc@example.com");

    const orgRes = await request(app)
      .post("/organizations")
      .set("Cookie", owner.header)
      .set("x-csrf-token", owner.cookies.csrf_token)
      .send({ name: "Priv Esc Org" });
    const orgId = orgRes.body.data.id;

    const rolesRes = await request(app).get(`/organizations/${orgId}/roles`).set("Cookie", owner.header);
    const employeeRole = rolesRes.body.data.find((r: { name: string }) => r.name === "EMPLOYEE");

    await request(app)
      .post(`/organizations/${orgId}/members`)
      .set("Cookie", owner.header)
      .set("x-csrf-token", owner.cookies.csrf_token)
      .send({ email: "employee-priv-esc@example.com", roleId: employeeRole.id });

    // EMPLOYEE role has no roles:manage permission -- attempt to grant
    // itself a more powerful role anyway.
    const res = await request(app)
      .post(`/organizations/${orgId}/roles`)
      .set("Cookie", employee.header)
      .set("x-csrf-token", employee.cookies.csrf_token)
      .send({ name: "Self-Granted Admin", permissionKeys: ["organization:delete", "billing:manage"] });
    expect(res.status).toBe(403);

    // Same EMPLOYEE also cannot delete the org outright.
    const deleteRes = await request(app)
      .delete(`/organizations/${orgId}`)
      .set("Cookie", employee.header)
      .set("x-csrf-token", employee.cookies.csrf_token);
    expect(deleteRes.status).toBe(403);
  });

  it("system roles cannot be modified or deleted even by the org OWNER", async () => {
    await seedPermissionCatalog();
    const owner = await registerAndLogin("owner-system-role@example.com");

    const orgRes = await request(app)
      .post("/organizations")
      .set("Cookie", owner.header)
      .set("x-csrf-token", owner.cookies.csrf_token)
      .send({ name: "System Role Org" });
    const orgId = orgRes.body.data.id;

    const rolesRes = await request(app).get(`/organizations/${orgId}/roles`).set("Cookie", owner.header);
    const ownerRole = rolesRes.body.data.find((r: { name: string }) => r.name === "OWNER");

    const patchRes = await request(app)
      .patch(`/organizations/${orgId}/roles/${ownerRole.id}`)
      .set("Cookie", owner.header)
      .set("x-csrf-token", owner.cookies.csrf_token)
      .send({ permissionKeys: [] });
    expect(patchRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/organizations/${orgId}/roles/${ownerRole.id}`)
      .set("Cookie", owner.header)
      .set("x-csrf-token", owner.cookies.csrf_token);
    expect(deleteRes.status).toBe(403);
  });
});
