import { Router } from "express";
import { db } from "../../infrastructure/database/client.js";
import { permissions } from "../../../db/schema/index.js";
import { requirePermission } from "../../middleware/authorization.js";
import { PERMISSIONS } from "../../shared/utils/permissions-catalog.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";

// Mounted at /organizations/:id/permissions. The catalog itself is global
// (not org-scoped), but we still require org membership + roles:read to
// view it, matching the API surface described in the spec.
export const permissionsRouter = Router({ mergeParams: true });

permissionsRouter.get(
  "/",
  requirePermission(PERMISSIONS.ROLES_READ),
  asyncHandler(async (_req, res) => {
    const all = await db.select().from(permissions);
    res.json({ data: all });
  })
);
