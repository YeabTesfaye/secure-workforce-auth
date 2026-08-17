import type { NextFunction, Request, Response } from "express";
import { getUserAgent } from "../shared/utils/request-context.js";
import { db } from "../infrastructure/database/client.js";
import { organizationMembers, roles, rolePermissions, permissions } from "../../db/schema/index.js";
import { and, eq } from "drizzle-orm";
import { ForbiddenError, UnauthorizedError } from "../shared/errors/app-error.js";
import { recordSecurityEvent } from "../modules/audit/audit.service.js";
import { asyncHandler } from "../shared/utils/async-handler.js";
import type { PermissionKey } from "../shared/utils/permissions-catalog.js";

// This is the core tenant-isolation control. It resolves :organizationId
// from the route, confirms the authenticated user is actually a member of
// that org (never trust the ID alone), and attaches their role + full
// permission set for THIS org to req.orgContext. Every org-scoped route
// must run this before any permission check, or a user could reach another
// tenant's data simply by knowing/guessing its UUID.
export const loadOrgContext = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) throw new UnauthorizedError();

    const organizationId = (req.params.organizationId ?? req.params.id) as string | undefined;
    if (!organizationId) {
      throw new ForbiddenError("Organization context is required for this route");
    }

    const [membership] = await db
      .select({
        membershipId: organizationMembers.id,
        roleId: roles.id,
        roleName: roles.name,
      })
      .from(organizationMembers)
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(
        and(
          eq(organizationMembers.userId, req.auth.userId),
          eq(organizationMembers.organizationId, organizationId)
        )
      )
      .limit(1);

    if (!membership) {
      // Do not leak whether the org exists at all. Same 403 either way.
      await recordSecurityEvent({
        event: "CROSS_TENANT_ACCESS_DENIED",
        userId: req.auth.userId,
        organizationId,
        ipAddress: req.ip,
        userAgent: getUserAgent(req),
        metadata: { path: req.path },
      });
      throw new ForbiddenError("You do not have access to this organization");
    }

    const permRows = await db
      .select({ key: permissions.key })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, membership.roleId));

    req.orgContext = {
      organizationId,
      membershipId: membership.membershipId,
      roleId: membership.roleId,
      roleName: membership.roleName,
      permissions: new Set(permRows.map((p) => p.key)),
    };

    next();
  }
);

// RBAC gate: does the caller's role in this org grant `permission`?
// This answers "is Bob a manager with projects:update" — necessary but,
// per the threat model, not sufficient for mutating a specific resource.
// Combine with a resource-ownership check (see requireProjectAccess) for that.
export function requirePermission(permission: PermissionKey) {
  return asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
    if (!req.orgContext) throw new ForbiddenError("Organization context not loaded");

    if (!req.orgContext.permissions.has(permission)) {
      await recordSecurityEvent({
        event: "PRIVILEGE_ESCALATION_DENIED",
        userId: req.auth?.userId,
        organizationId: req.orgContext.organizationId,
        ipAddress: req.ip,
        userAgent: getUserAgent(req),
        metadata: { requiredPermission: permission, roleName: req.orgContext.roleName, path: req.path },
      });
      throw new ForbiddenError(`Missing required permission: ${permission}`);
    }

    next();
  });
}
