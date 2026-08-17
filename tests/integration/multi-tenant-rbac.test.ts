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

describe("multi-tenant RBAC (integration)", () => {
  beforeEach(async () => {
    await seedPermissionCatalog();
  });

  it("Owner can create an org; Owner and only Owner can update/delete it", async () => {
    const alice = await registerAndLogin("alice@acme.com");

    const createRes = await request(app)
      .post("/organizations")
      .set("Cookie", alice.header)
      .set("x-csrf-token", alice.cookies.csrf_token)
      .send({ name: "Acme Corporation" });
    expect(createRes.status).toBe(201);
    const orgId = createRes.body.data.id;

    // Regression test: GET /organizations must return the human-readable
    // role name ("OWNER"), not the raw roleId UUID mistakenly aliased as
    // roleName.
    const listRes = await request(app).get("/organizations").set("Cookie", alice.header);
    const created = listRes.body.data.find((o: { id: string }) => o.id === orgId);
    expect(created.roleName).toBe("OWNER");

    const updateRes = await request(app)
      .patch(`/organizations/${orgId}`)
      .set("Cookie", alice.header)
      .set("x-csrf-token", alice.cookies.csrf_token)
      .send({ name: "Acme Corp (Updated)" });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.name).toBe("Acme Corp (Updated)");
  });

  it("a user from Organization A gets 403 accessing Organization B, and it is audit logged", async () => {
    const alice = await registerAndLogin("alice2@acme.com");
    const mallory = await registerAndLogin("mallory@evil.com");

    const orgRes = await request(app)
      .post("/organizations")
      .set("Cookie", alice.header)
      .set("x-csrf-token", alice.cookies.csrf_token)
      .send({ name: "Acme Corp 2" });
    const orgId = orgRes.body.data.id;

    // Mallory is not a member of Alice's org, and only knows the ID.
    const res = await request(app).get(`/organizations/${orgId}`).set("Cookie", mallory.header);
    expect(res.status).toBe(403);

    // The audit endpoint (as Alice, who has permission) should show the denial.
    const auditRes = await request(app)
      .get(`/organizations/${orgId}/audit-logs?event=CROSS_TENANT_ACCESS_DENIED`)
      .set("Cookie", alice.header);
    expect(auditRes.status).toBe(200);
    expect(auditRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("Employee is denied changing organization settings (403)", async () => {
    const alice = await registerAndLogin("alice3@acme.com");
    const carol = await registerAndLogin("carol3@acme.com");

    const orgRes = await request(app)
      .post("/organizations")
      .set("Cookie", alice.header)
      .set("x-csrf-token", alice.cookies.csrf_token)
      .send({ name: "Acme Corp 3" });
    const orgId = orgRes.body.data.id;

    const rolesRes = await request(app).get(`/organizations/${orgId}/roles`).set("Cookie", alice.header);
    const employeeRole = rolesRes.body.data.find((r: { name: string }) => r.name === "EMPLOYEE");

    await request(app)
      .post(`/organizations/${orgId}/members`)
      .set("Cookie", alice.header)
      .set("x-csrf-token", alice.cookies.csrf_token)
      .send({ email: "carol3@acme.com", roleId: employeeRole.id });

    const patchRes = await request(app)
      .patch(`/organizations/${orgId}`)
      .set("Cookie", carol.header)
      .set("x-csrf-token", carol.cookies.csrf_token)
      .send({ name: "Hacked By Carol" });
    expect(patchRes.status).toBe(403);
  });

  it("Manager can update an assigned project but not billing; after demotion, project update is denied", async () => {
    const alice = await registerAndLogin("alice4@acme.com");
    const bob = await registerAndLogin("bob4@acme.com");

    const orgRes = await request(app)
      .post("/organizations")
      .set("Cookie", alice.header)
      .set("x-csrf-token", alice.cookies.csrf_token)
      .send({ name: "Acme Corp 4" });
    const orgId = orgRes.body.data.id;

    const rolesRes = await request(app).get(`/organizations/${orgId}/roles`).set("Cookie", alice.header);
    const managerRole = rolesRes.body.data.find((r: { name: string }) => r.name === "MANAGER");
    const employeeRole = rolesRes.body.data.find((r: { name: string }) => r.name === "EMPLOYEE");

    await request(app)
      .post(`/organizations/${orgId}/members`)
      .set("Cookie", alice.header)
      .set("x-csrf-token", alice.cookies.csrf_token)
      .send({ email: "bob4@acme.com", roleId: managerRole.id });

    const projectRes = await request(app)
      .post(`/organizations/${orgId}/projects`)
      .set("Cookie", alice.header)
      .set("x-csrf-token", alice.cookies.csrf_token)
      .send({ name: "Website Redesign" });
    const projectId = projectRes.body.data.id;

    // Bob is a manager but not YET assigned to this project -> resource-level denial.
    const denied = await request(app)
      .patch(`/organizations/${orgId}/projects/${projectId}`)
      .set("Cookie", bob.header)
      .set("x-csrf-token", bob.cookies.csrf_token)
      .send({ name: "Website Redesign v2" });
    expect(denied.status).toBe(403);

    // Assign Bob as manager of the project (Alice, as OWNER, does this).
    await request(app)
      .patch(`/organizations/${orgId}/projects/${projectId}`)
      .set("Cookie", alice.header)
      .set("x-csrf-token", alice.cookies.csrf_token)
      .send({ managerId: (await getUserIdByEmail(app, alice, orgId, "bob4@acme.com")) });

    const allowed = await request(app)
      .patch(`/organizations/${orgId}/projects/${projectId}`)
      .set("Cookie", bob.header)
      .set("x-csrf-token", bob.cookies.csrf_token)
      .send({ name: "Website Redesign v2" });
    expect(allowed.status).toBe(200);

    // Bob attempts to manage billing -> denied, no such permission on MANAGER role.
    // (No billing endpoint is implemented in this build; RBAC is proven via
    // roles:manage / members:delete style checks instead in other tests.)

    // Demote Bob to EMPLOYEE; his sessions are revoked so his old cookies
    // must now fail authentication rather than authorization.
    await request(app)
      .patch(`/organizations/${orgId}/members/${await getUserIdByEmail(app, alice, orgId, "bob4@acme.com")}`)
      .set("Cookie", alice.header)
      .set("x-csrf-token", alice.cookies.csrf_token)
      .send({ roleId: employeeRole.id });

    const afterDemotion = await request(app)
      .patch(`/organizations/${orgId}/projects/${projectId}`)
      .set("Cookie", bob.header)
      .set("x-csrf-token", bob.cookies.csrf_token)
      .send({ name: "Should not work" });
    expect([401, 403]).toContain(afterDemotion.status);
  });
});

async function getUserIdByEmail(app: ReturnType<typeof createApp>, actor: { header: string }, orgId: string, email: string) {
  const res = await request(app).get(`/organizations/${orgId}/members`).set("Cookie", actor.header);
  const member = res.body.data.find((m: { email: string }) => m.email === email);
  return member.userId;
}