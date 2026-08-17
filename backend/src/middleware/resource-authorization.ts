import type { NextFunction, Request, Response } from "express";
import { getUserAgent } from "../shared/utils/request-context.js";
import { db } from "../infrastructure/database/client.js";
import { projects } from "../../db/schema/index.js";
import { and, eq } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "../shared/errors/app-error.js";
import { recordSecurityEvent } from "../modules/audit/audit.service.js";
import { asyncHandler } from "../shared/utils/async-handler.js";

// Demonstrates fine-grained, resource-level authorization on top of RBAC.
// Having `projects:update` (checked by requirePermission upstream) proves
// the caller's ROLE allows updating projects in general. This middleware
// answers the narrower question the threat model calls out explicitly:
// "Can THIS user modify THIS project?" Org OWNER can always act on any
// project in their org; a MANAGER may only act on projects they are
// assigned to manage, even though their role grants projects:update broadly.
export const requireProjectAccess = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const { organizationId, roleName, membershipId } = req.orgContext!;
    const projectId = req.params.projectId as string;

    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
      .limit(1);

    if (!project) {
      throw new NotFoundError("Project not found");
    }

    const isOwnerRole = roleName === "OWNER";
    const isAssignedManager = project.managerId === req.auth!.userId;

    if (!isOwnerRole && !isAssignedManager) {
      await recordSecurityEvent({
        event: "PRIVILEGE_ESCALATION_DENIED",
        userId: req.auth!.userId,
        organizationId,
        ipAddress: req.ip,
        userAgent: getUserAgent(req),
        metadata: {
          reason: "not_assigned_project_manager",
          projectId,
          membershipId,
          roleName,
        },
      });
      throw new ForbiddenError("You are not authorized to modify this project");
    }

    req.project = project;
    next();
  }
);
