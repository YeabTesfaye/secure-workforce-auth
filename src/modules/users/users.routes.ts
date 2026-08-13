import { Router } from "express";
import { z } from "zod";
import { getUserProfile, updateUserProfile } from "./users.service.js";
import { authenticateAccessToken } from "../../middleware/authentication.js";
import { csrfProtection } from "../../middleware/csrf.js";
import { asyncHandler } from "../../shared/utils/async-handler.js";

export const usersRouter = Router();
usersRouter.use(authenticateAccessToken);

const updateProfileSchema = z.object({
  fullName: z.string().min(1).max(255).optional(),
});

usersRouter.get(
  "/me",
  asyncHandler(async (req, res) => {
    const profile = await getUserProfile(req.auth!.userId);
    res.json({ data: profile });
  })
);

usersRouter.patch(
  "/me",
  csrfProtection,
  asyncHandler(async (req, res) => {
    const input = updateProfileSchema.parse(req.body);
    const profile = await updateUserProfile(req.auth!.userId, input);
    res.json({ data: profile });
  })
);
