import { db } from "../../infrastructure/database/client.js";
import {
  organizations,
  organizationMembers,
  roles,
  rolePermissions,
  permissions,
} from "../../../db/schema/index.js";
import { eq } from "drizzle-orm";
import { NotFoundError } from "../../shared/errors/app-error.js";
import { SYSTEM_ROLES } from "../../shared/utils/permissions-catalog.js";
import { recordSecurityEvent } from "../audit/audit.service.js";

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).slice(2, 7)
  );
}

// Creating an org is transactional: the org row, its four system roles,
// their permission grants (looked up from the global permission catalog),
// and the creator's OWNER membership must all succeed together or none do.
export async function createOrganization(name: string, ownerUserId: string, ctx: { ip?: string; userAgent?: string }) {
  const slug = slugify(name);

  return db.transaction(async (tx) => {
    const [org] = await tx.insert(organizations).values({ name, slug }).returning();

    const allPermissionRows = await tx.select().from(permissions);
    const permByKey = new Map(allPermissionRows.map((p) => [p.key, p.id]));

    let ownerRoleId: string | undefined;

    for (const [roleName, permKeys] of Object.entries(SYSTEM_ROLES)) {
      const [role] = await tx
        .insert(roles)
        .values({ organizationId: org.id, name: roleName, isSystem: true })
        .returning();

      if (roleName === "OWNER") ownerRoleId = role.id;

      const grantRows = permKeys
        .map((key) => permByKey.get(key))
        .filter((id): id is string => Boolean(id))
        .map((permissionId) => ({ roleId: role.id, permissionId }));

      if (grantRows.length > 0) {
        await tx.insert(rolePermissions).values(grantRows);
      }
    }

    if (!ownerRoleId) throw new Error("OWNER role failed to seed");

    await tx.insert(organizationMembers).values({
      userId: ownerUserId,
      organizationId: org.id,
      roleId: ownerRoleId,
    });

    await recordSecurityEvent({
      event: "ORGANIZATION_CREATED",
      userId: ownerUserId,
      organizationId: org.id,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return org;
  });
}

export async function listOrganizationsForUser(userId: string) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      roleId: roles.id,
      roleName: roles.name,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(eq(organizationMembers.userId, userId));
}

export async function getOrganization(organizationId: string) {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  if (!org) throw new NotFoundError("Organization not found");
  return org;
}

export async function updateOrganization(
  organizationId: string,
  input: { name?: string },
  ctx: { userId: string; ip?: string; userAgent?: string }
) {
  const [updated] = await db
    .update(organizations)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(organizations.id, organizationId))
    .returning();
  if (!updated) throw new NotFoundError("Organization not found");

  await recordSecurityEvent({
    event: "ORGANIZATION_UPDATED",
    userId: ctx.userId,
    organizationId,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: input,
  });

  return updated;
}

export async function deleteOrganization(organizationId: string) {
  const [existing] = await db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1);
  if (!existing) throw new NotFoundError("Organization not found");
  await db.delete(organizations).where(eq(organizations.id, organizationId));
}