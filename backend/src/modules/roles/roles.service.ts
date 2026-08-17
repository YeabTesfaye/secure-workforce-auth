import { db } from "../../infrastructure/database/client.js";
import { roles, rolePermissions, permissions, organizationMembers } from "../../../db/schema/index.js";
import { and, eq, inArray } from "drizzle-orm";
import { ForbiddenError, NotFoundError, ValidationError } from "../../shared/errors/app-error.js";
import { recordSecurityEvent } from "../audit/audit.service.js";

export async function listRoles(organizationId: string) {
  return db.select().from(roles).where(eq(roles.organizationId, organizationId));
}

export async function createRole(
  organizationId: string,
  name: string,
  permissionKeys: string[],
  ctx: { actorUserId: string; ip?: string; userAgent?: string }
) {
  const permRows = await db.select().from(permissions).where(inArray(permissions.key, permissionKeys));
  if (permRows.length !== permissionKeys.length) {
    throw new ValidationError("One or more permission keys are invalid");
  }

  const [role] = await db.insert(roles).values({ organizationId, name, isSystem: false }).returning();

  if (permRows.length > 0) {
    await db
      .insert(rolePermissions)
      .values(permRows.map((p) => ({ roleId: role.id, permissionId: p.id })));
  }

  await recordSecurityEvent({
    event: "PERMISSION_CHANGED",
    userId: ctx.actorUserId,
    organizationId,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: { action: "role_created", roleId: role.id, permissionKeys },
  });

  return role;
}

export async function updateRolePermissions(
  organizationId: string,
  roleId: string,
  permissionKeys: string[],
  ctx: { actorUserId: string; ip?: string; userAgent?: string }
) {
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, organizationId)))
    .limit(1);
  if (!role) throw new NotFoundError("Role not found");
  if (role.isSystem) throw new ForbiddenError("System roles cannot be modified");

  const permRows = await db.select().from(permissions).where(inArray(permissions.key, permissionKeys));
  if (permRows.length !== permissionKeys.length) {
    throw new ValidationError("One or more permission keys are invalid");
  }

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (permRows.length > 0) {
    await db.insert(rolePermissions).values(permRows.map((p) => ({ roleId, permissionId: p.id })));
  }

  await recordSecurityEvent({
    event: "PERMISSION_CHANGED",
    userId: ctx.actorUserId,
    organizationId,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: { action: "role_permissions_updated", roleId, permissionKeys },
  });
}

export async function deleteRole(
  organizationId: string,
  roleId: string,
  ctx: { actorUserId: string; ip?: string; userAgent?: string }
) {
  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, organizationId)))
    .limit(1);
  if (!role) throw new NotFoundError("Role not found");
  if (role.isSystem) throw new ForbiddenError("System roles cannot be deleted");

  const [inUse] = await db
    .select()
    .from(organizationMembers)
    .where(eq(organizationMembers.roleId, roleId))
    .limit(1);
  if (inUse) throw new ValidationError("Cannot delete a role that is still assigned to members");

  await db.delete(roles).where(eq(roles.id, roleId));

  await recordSecurityEvent({
    event: "PERMISSION_CHANGED",
    userId: ctx.actorUserId,
    organizationId,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: { action: "role_deleted", roleId },
  });
}
