import { Router } from "express";
import { getUserAgent } from "../../shared/utils/request-context.js";
import { z } from "zod";
import * as service from "./roles.service.js";
import { requirePermission } from "../../middleware/authorization.js";
import { csrfProtection } from "../../middleware/csrf.js";
import { PERMISSIONS } from "../../shared/utils/permissions-catalog.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";

export const rolesRouter = Router({ mergeParams: true });

const createRoleSchema = z.object({
  name: z.string().min(1).max(100),
  permissionKeys: z.array(z.string()).default([]),
});

const updateRoleSchema = z.object({
  permissionKeys: z.array(z.string()),
});

function ctx(req: any) {
  return { actorUserId: req.auth!.userId, ip: req.ip, userAgent: getUserAgent(req) };
}

rolesRouter.get(
  "/",
  requirePermission(PERMISSIONS.ROLES_READ),
  asyncHandler(async (req, res) => {
    const roles = await service.listRoles(req.orgContext!.organizationId);
    res.json({ data: roles });
  })
);

rolesRouter.post(
  "/",
  csrfProtection,
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  asyncHandler(async (req, res) => {
    const input = createRoleSchema.parse(req.body);
    const role = await service.createRole(
      req.orgContext!.organizationId,
      input.name,
      input.permissionKeys,
      ctx(req)
    );
    res.status(201).json({ data: role });
  })
);

rolesRouter.patch(
  "/:roleId",
  csrfProtection,
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  asyncHandler(async (req, res) => {
    const input = updateRoleSchema.parse(req.body);
    await service.updateRolePermissions(
      req.orgContext!.organizationId,
      (req.params.roleId as string),
      input.permissionKeys,
      ctx(req)
    );
    res.json({ data: { updated: true } });
  })
);

rolesRouter.delete(
  "/:roleId",
  csrfProtection,
  requirePermission(PERMISSIONS.ROLES_MANAGE),
  asyncHandler(async (req, res) => {
    await service.deleteRole(req.orgContext!.organizationId, (req.params.roleId as string), ctx(req));
    res.status(204).send();
  })
);
