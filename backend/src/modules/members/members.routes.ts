import { Router } from "express";
import { getUserAgent } from "../../shared/utils/request-context.js";
import { z } from "zod";
import * as service from "./members.service.js";
import { requirePermission } from "../../middleware/authorization.js";
import { csrfProtection } from "../../middleware/csrf.js";
import { PERMISSIONS } from "../../shared/utils/permissions-catalog.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";

// Mounted at /organizations/:id/members. loadOrgContext already ran via the
// parent router's "/:id" middleware, so req.orgContext is populated here.
export const membersRouter = Router({ mergeParams: true });

const addMemberSchema = z.object({
  email: z.string().email(),
  roleId: z.string().uuid(),
});

const updateMemberSchema = z.object({
  roleId: z.string().uuid(),
});

membersRouter.get(
  "/",
  requirePermission(PERMISSIONS.MEMBERS_READ),
  asyncHandler(async (req, res) => {
    const members = await service.listMembers(req.orgContext!.organizationId);
    res.json({ data: members });
  })
);

membersRouter.post(
  "/",
  csrfProtection,
  requirePermission(PERMISSIONS.MEMBERS_CREATE),
  asyncHandler(async (req, res) => {
    const input = addMemberSchema.parse(req.body);
    const membership = await service.addMember(req.orgContext!.organizationId, input.email, input.roleId, {
      invitedBy: req.auth!.userId,
      ip: req.ip,
      userAgent: getUserAgent(req),
    });
    res.status(201).json({ data: membership });
  })
);

membersRouter.patch(
  "/:userId",
  csrfProtection,
  requirePermission(PERMISSIONS.MEMBERS_UPDATE),
  asyncHandler(async (req, res) => {
    const input = updateMemberSchema.parse(req.body);
    await service.updateMemberRole(req.orgContext!.organizationId, (req.params.userId as string), input.roleId, {
      actorUserId: req.auth!.userId,
      ip: req.ip,
      userAgent: getUserAgent(req),
    });
    res.json({ data: { updated: true } });
  })
);

membersRouter.delete(
  "/:userId",
  csrfProtection,
  requirePermission(PERMISSIONS.MEMBERS_DELETE),
  asyncHandler(async (req, res) => {
    await service.removeMember(req.orgContext!.organizationId, (req.params.userId as string), {
      actorUserId: req.auth!.userId,
      ip: req.ip,
      userAgent: getUserAgent(req),
    });
    res.status(204).send();
  })
);
