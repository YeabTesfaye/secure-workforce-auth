import { Router } from "express";
import { getUserAgent } from "../../shared/utils/request-context.js";
import { listSessions, revokeSession, revokeAllSessions } from "./sessions.service.js";
import { authenticateAccessToken } from "../../middleware/authentication.js";
import { csrfProtection } from "../../middleware/csrf.js";
import { recordSecurityEvent } from "../audit/audit.service.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";
import { UnauthorizedError } from "../../shared/errors/app-error.js";

export const sessionsRouter = Router();
sessionsRouter.use(authenticateAccessToken);

sessionsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const sessions = await listSessions(req.auth!.userId);
    res.json({
      data: sessions.map((s) => ({
        id: s.id,
        deviceLabel: s.deviceLabel,
        ipAddress: s.ipAddress,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        isCurrent: s.id === req.auth!.sessionId,
      })),
    });
  })
);

sessionsRouter.delete(
  "/all",
  csrfProtection,
  asyncHandler(async (req, res) => {
    if (!req.auth) throw new UnauthorizedError();
    await revokeAllSessions(req.auth.userId, req.auth.sessionId);
    await recordSecurityEvent({
      event: "SESSION_REVOKED",
      userId: req.auth.userId,
      ipAddress: req.ip,
      userAgent: getUserAgent(req),
      metadata: { reason: "revoke_all_except_current" },
    });
    res.json({ data: { revoked: true } });
  })
);

sessionsRouter.delete(
  "/:id",
  csrfProtection,
  asyncHandler(async (req, res) => {
    await revokeSession(req.auth!.userId, (req.params.id as string));
    await recordSecurityEvent({
      event: "SESSION_REVOKED",
      userId: req.auth!.userId,
      ipAddress: req.ip,
      userAgent: getUserAgent(req),
      metadata: { sessionId: (req.params.id as string), reason: "manual_revoke" },
    });
    res.json({ data: { revoked: true } });
  })
);
