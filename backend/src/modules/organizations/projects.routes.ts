import { Router } from "express";
import { z } from "zod";
import * as service from "./projects.service.js";
import { requirePermission } from "../../middleware/authorization.js";
import { requireProjectAccess } from "../../middleware/resource-authorization.js";
import { csrfProtection } from "../../middleware/csrf.js";
import { PERMISSIONS } from "../../shared/utils/permissions-catalog.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";

export const projectsRouter = Router({ mergeParams: true });

const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  managerId: z.string().uuid().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  managerId: z.string().uuid().optional(),
});

projectsRouter.get(
  "/",
  requirePermission(PERMISSIONS.PROJECTS_READ),
  asyncHandler(async (req, res) => {
    const list = await service.listProjects(req.orgContext!.organizationId);
    res.json({ data: list });
  })
);

projectsRouter.post(
  "/",
  csrfProtection,
  requirePermission(PERMISSIONS.PROJECTS_CREATE),
  asyncHandler(async (req, res) => {
    const input = createProjectSchema.parse(req.body);
    const project = await service.createProject(req.orgContext!.organizationId, input.name, input.managerId);
    res.status(201).json({ data: project });
  })
);

// RBAC gate first (requirePermission: does the role allow projects:update
// at all), THEN resource-level gate (requireProjectAccess: is THIS caller
// the assigned manager of THIS project, or org OWNER). This ordering is
// deliberate -- resource lookups are more expensive, so cheaper role checks
// fail fast first.
projectsRouter.patch(
  "/:projectId",
  csrfProtection,
  requirePermission(PERMISSIONS.PROJECTS_UPDATE),
  requireProjectAccess,
  asyncHandler(async (req, res) => {
    const input = updateProjectSchema.parse(req.body);
    const project = await service.updateProject(
      req.orgContext!.organizationId,
      req.params.projectId as string,
      input
    );
    res.json({ data: project });
  })
);