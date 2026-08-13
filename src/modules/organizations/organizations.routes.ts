import { Router } from "express";
import { getUserAgent } from "../../shared/utils/request-context.js";
import * as service from "./organizations.service.js";
import { createOrganizationSchema, updateOrganizationSchema } from "./organizations.schemas.js";
import { authenticateAccessToken } from "../../middleware/authentication.js";
import { loadOrgContext, requirePermission } from "../../middleware/authorization.js";
import { csrfProtection } from "../../middleware/csrf.js";
import { PERMISSIONS } from "../../shared/utils/permissions-catalog.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { membersRouter } from "../members/members.routes.js";
import { rolesRouter } from "../roles/roles.routes.js";
import { permissionsRouter } from "../permissions/permissions.routes.js";
import { auditRouter } from "../audit/audit.routes.js";
import { projectsRouter } from "../organizations/projects.routes.js";

export const organizationsRouter = Router();
organizationsRouter.use(authenticateAccessToken);

organizationsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const orgs = await service.listOrganizationsForUser(req.auth!.userId);
    res.json({ data: orgs });
  })
);

organizationsRouter.post(
  "/",
  csrfProtection,
  asyncHandler(async (req, res) => {
    const input = createOrganizationSchema.parse(req.body);
    const org = await service.createOrganization(input.name, req.auth!.userId, {
      ip: req.ip,
      userAgent: getUserAgent(req),
    });
    res.status(201).json({ data: org });
  })
);

// Every route below this point is scoped to a specific :id (organizationId)
// and requires the caller to be a member -- loadOrgContext enforces that
// and populates req.orgContext for the permission checks that follow.
organizationsRouter.use("/:id", loadOrgContext);

organizationsRouter.get(
  "/:id",
  requirePermission(PERMISSIONS.ORGANIZATION_READ),
  asyncHandler(async (req, res) => {
    const org = await service.getOrganization((req.params.id as string));
    res.json({ data: org });
  })
);

organizationsRouter.patch(
  "/:id",
  csrfProtection,
  requirePermission(PERMISSIONS.ORGANIZATION_UPDATE),
  asyncHandler(async (req, res) => {
    const input = updateOrganizationSchema.parse(req.body);
    const org = await service.updateOrganization((req.params.id as string), input, {
      userId: req.auth!.userId,
      ip: req.ip,
      userAgent: getUserAgent(req),
    });
    res.json({ data: org });
  })
);

organizationsRouter.delete(
  "/:id",
  csrfProtection,
  requirePermission(PERMISSIONS.ORGANIZATION_DELETE),
  asyncHandler(async (req, res) => {
    await service.deleteOrganization((req.params.id as string));
    res.status(204).send();
  })
);

organizationsRouter.use("/:id/members", membersRouter);
organizationsRouter.use("/:id/roles", rolesRouter);
organizationsRouter.use("/:id/permissions", permissionsRouter);
organizationsRouter.use("/:id/audit-logs", auditRouter);
organizationsRouter.use("/:id/projects", projectsRouter);
