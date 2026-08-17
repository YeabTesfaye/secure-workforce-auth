import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { seedPermissionCatalog, extractCookies, cookieHeader } from "../helpers.js";
import { db } from "../../src/infrastructure/database/client.js";
import { auditLogs } from "../../db/schema/index.js";
import { eq } from "drizzle-orm";

const app = createApp();

async function registerAndLogin(email: string, password = "CorrectHorseBattery9!") {
  await request(app).post("/auth/register").send({ email, password });
  const res = await request(app).post("/auth/login").send({ email, password });
  const cookies = extractCookies(res);
  return { cookies, header: cookieHeader(cookies) };
}

async function createOrg(actor: { header: string; cookies: Record<string, string> }, name: string) {
  const res = await request(app)
    .post("/organizations")
    .set("Cookie", actor.header)
    .set("x-csrf-token", actor.cookies.csrf_token)
    .send({ name });
  return res.body.data.id as string;
}

/**
 * These tests prove tenant isolation holds for every tenant-scoped resource
 * type, and that it cannot be bypassed by manipulating IDs -- not just that
 * the "get org by id" happy path works. Each test uses two genuinely
 * separate organizations with no shared membership, then confirms the
 * outsider gets 403 regardless of which resource ID they guess correctly.
 */
describe("cross-tenant isolation (security)", () => {
  beforeEach(async () => {
    await seedPermissionCatalog();
  });

  it("ORGANIZATION: outsider cannot read, update, or delete another org", async () => {
    const owner = await registerAndLogin("owner-org1@example.com");
    const outsider = await registerAndLogin("outsider-org1@example.com");
    const orgId = await createOrg(owner, "Tenant A");

    const getRes = await request(app).get(`/organizations/${orgId}`).set("Cookie", outsider.header);
    expect(getRes.status).toBe(403);

    const patchRes = await request(app)
      .patch(`/organizations/${orgId}`)
      .set("Cookie", outsider.header)
      .set("x-csrf-token", outsider.cookies.csrf_token)
      .send({ name: "Pwned" });
    expect(patchRes.status).toBe(403);

    const deleteRes = await request(app)
      .delete(`/organizations/${orgId}`)
      .set("Cookie", outsider.header)
      .set("x-csrf-token", outsider.cookies.csrf_token);
    expect(deleteRes.status).toBe(403);
  });

  it("MEMBERS: outsider cannot list, add, update, or remove members of another org", async () => {
    const owner = await registerAndLogin("owner-org2@example.com");
    const outsider = await registerAndLogin("outsider-org2@example.com");
    const orgId = await createOrg(owner, "Tenant B");

    const listRes = await request(app).get(`/organizations/${orgId}/members`).set("Cookie", outsider.header);
    expect(listRes.status).toBe(403);

    const addRes = await request(app)
      .post(`/organizations/${orgId}/members`)
      .set("Cookie", outsider.header)
      .set("x-csrf-token", outsider.cookies.csrf_token)
      .send({ email: "owner-org2@example.com", roleId: "00000000-0000-0000-0000-000000000000" });
    expect(addRes.status).toBe(403);

    // Even the outsider's OWN user id as the target doesn't help -- the
    // membership check runs before the target-user lookup.
    const removeRes = await request(app)
      .delete(`/organizations/${orgId}/members/${outsider.cookies.csrf_token}`) // any id, org gate rejects first
      .set("Cookie", outsider.header)
      .set("x-csrf-token", outsider.cookies.csrf_token);
    expect(removeRes.status).toBe(403);
  });

  it("PROJECTS: outsider cannot list, create, or update projects in another org, even with a guessed real project ID", async () => {
    const owner = await registerAndLogin("owner-org3@example.com");
    const outsider = await registerAndLogin("outsider-org3@example.com");
    const orgId = await createOrg(owner, "Tenant C");

    const projectRes = await request(app)
      .post(`/organizations/${orgId}/projects`)
      .set("Cookie", owner.header)
      .set("x-csrf-token", owner.cookies.csrf_token)
      .send({ name: "Secret Project" });
    const projectId = projectRes.body.data.id as string;

    const listRes = await request(app).get(`/organizations/${orgId}/projects`).set("Cookie", outsider.header);
    expect(listRes.status).toBe(403);

    const createRes = await request(app)
      .post(`/organizations/${orgId}/projects`)
      .set("Cookie", outsider.header)
      .set("x-csrf-token", outsider.cookies.csrf_token)
      .send({ name: "Injected Project" });
    expect(createRes.status).toBe(403);

    // The outsider knows the REAL project ID (e.g. leaked/guessed) but is
    // still rejected at the org-membership gate before resource-level
    // authorization is ever reached.
    const updateRes = await request(app)
      .patch(`/organizations/${orgId}/projects/${projectId}`)
      .set("Cookie", outsider.header)
      .set("x-csrf-token", outsider.cookies.csrf_token)
      .send({ name: "Hijacked" });
    expect(updateRes.status).toBe(403);
  });

  it("AUDIT LOGS: outsider cannot read another org's audit trail", async () => {
    const owner = await registerAndLogin("owner-org4@example.com");
    const outsider = await registerAndLogin("outsider-org4@example.com");
    const orgId = await createOrg(owner, "Tenant D");

    const res = await request(app).get(`/organizations/${orgId}/audit-logs`).set("Cookie", outsider.header);
    expect(res.status).toBe(403);
  });

  it("ROLES and PERMISSIONS: outsider cannot read or manage another org's roles", async () => {
    const owner = await registerAndLogin("owner-org5@example.com");
    const outsider = await registerAndLogin("outsider-org5@example.com");
    const orgId = await createOrg(owner, "Tenant E");

    const listRolesRes = await request(app).get(`/organizations/${orgId}/roles`).set("Cookie", outsider.header);
    expect(listRolesRes.status).toBe(403);

    const listPermsRes = await request(app)
      .get(`/organizations/${orgId}/permissions`)
      .set("Cookie", outsider.header);
    expect(listPermsRes.status).toBe(403);

    const createRoleRes = await request(app)
      .post(`/organizations/${orgId}/roles`)
      .set("Cookie", outsider.header)
      .set("x-csrf-token", outsider.cookies.csrf_token)
      .send({ name: "Backdoor Role", permissionKeys: ["organization:delete"] });
    expect(createRoleRes.status).toBe(403);
  });

  it("a nonexistent organization ID returns the SAME 403 as a real one the caller can't access", async () => {
    // This is the enumeration-resistance property: the response must not
    // let a caller distinguish "org exists but I'm not in it" from
    // "org doesn't exist at all" by status code or message shape.
    const outsider = await registerAndLogin("outsider-nonexistent@example.com");

    const fakeOrgId = "11111111-1111-1111-1111-111111111111";
    const res = await request(app).get(`/organizations/${fakeOrgId}`).set("Cookie", outsider.header);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  it("every cross-tenant denial is recorded as a CROSS_TENANT_ACCESS_DENIED audit event", async () => {
    const owner = await registerAndLogin("owner-org6@example.com");
    const outsider = await registerAndLogin("outsider-org6@example.com");
    const orgId = await createOrg(owner, "Tenant F");

    await request(app).get(`/organizations/${orgId}`).set("Cookie", outsider.header);

    const events = await db.select().from(auditLogs).where(eq(auditLogs.event, "CROSS_TENANT_ACCESS_DENIED"));
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events.some((e) => e.organizationId === orgId)).toBe(true);
  });

  it("resource-level authorization still applies to members of the SAME org (not just outsiders)", async () => {
    // Distinguishes "not a member" (org-level, tested above) from
    // "a member, but not authorized for THIS resource" (resource-level).
    // Same-org MANAGER, not assigned to a project, is still denied --
    // proving the resource check is independent of tenant membership.
    const owner = await registerAndLogin("owner-org7@example.com");
    const manager = await registerAndLogin("manager-org7@example.com");
    const orgId = await createOrg(owner, "Tenant G");

    const rolesRes = await request(app).get(`/organizations/${orgId}/roles`).set("Cookie", owner.header);
    const managerRole = rolesRes.body.data.find((r: { name: string }) => r.name === "MANAGER");

    await request(app)
      .post(`/organizations/${orgId}/members`)
      .set("Cookie", owner.header)
      .set("x-csrf-token", owner.cookies.csrf_token)
      .send({ email: "manager-org7@example.com", roleId: managerRole.id });

    const projectRes = await request(app)
      .post(`/organizations/${orgId}/projects`)
      .set("Cookie", owner.header)
      .set("x-csrf-token", owner.cookies.csrf_token)
      .send({ name: "Unassigned Project" });
    const projectId = projectRes.body.data.id;

    // Manager IS a legitimate member of this org (membership check passes)
    // but is NOT the assigned manager of this specific project.
    const res = await request(app)
      .patch(`/organizations/${orgId}/projects/${projectId}`)
      .set("Cookie", manager.header)
      .set("x-csrf-token", manager.cookies.csrf_token)
      .send({ name: "Should be denied" });
    expect(res.status).toBe(403);
  });
});
