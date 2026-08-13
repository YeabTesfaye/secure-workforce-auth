import { Router } from "express";
import { queryAuditLogs } from "./audit.service.js";
import { auditLogQuerySchema } from "./audit.schemas.js";
import { requirePermission } from "../../middleware/authorization.js";
import { PERMISSIONS } from "../../shared/utils/permissions-catalog.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";

// Mounted at /organizations/:id/audit-logs by the org-scoping router.
// By the time these handlers run, authenticateAccessToken + loadOrgContext
// have already populated req.orgContext with the caller's permission set.
export const auditRouter = Router({ mergeParams: true });

auditRouter.get(
  "/",
  requirePermission(PERMISSIONS.AUDIT_LOGS_READ),
  asyncHandler(async (req, res) => {
    const parsed = auditLogQuerySchema.parse(req.query);
    const logs = await queryAuditLogs({
      organizationId: req.orgContext!.organizationId,
      ...parsed,
    });
    res.json({ data: logs, pagination: { limit: parsed.limit, offset: parsed.offset } });
  })
);
