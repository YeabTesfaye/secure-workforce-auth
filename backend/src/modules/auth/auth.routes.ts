import { Router } from "express";
import * as controller from "./auth.controller.js";
import { authenticateAccessToken } from "../../middleware/authentication.js";
import { csrfProtection } from "../../middleware/csrf.js";
import { rateLimit, keyByEmailFromBody } from "../../middleware/rate-limit.js";
import { env } from "../../config/env.js";

export const authRouter = Router();

authRouter.post(
  "/register",
  rateLimit({ bucket: "register", max: env.RATE_LIMIT_REGISTER_MAX, windowSeconds: env.RATE_LIMIT_REGISTER_WINDOW_SECONDS }),
  controller.register
);

authRouter.post("/verify-email", controller.verifyEmail);

authRouter.post(
  "/login",
  rateLimit({ bucket: "login-ip", max: env.RATE_LIMIT_LOGIN_MAX, windowSeconds: env.RATE_LIMIT_LOGIN_WINDOW_SECONDS }),
  rateLimit({
    bucket: "login-email",
    max: env.RATE_LIMIT_LOGIN_MAX,
    windowSeconds: env.RATE_LIMIT_LOGIN_WINDOW_SECONDS,
    keyFn: keyByEmailFromBody,
  }),
  controller.login
);

// Logout is a mutation and cookie-authenticated, so it goes through CSRF.
authRouter.post("/logout", csrfProtection, authenticateAccessToken, controller.logout);

// Refresh is intentionally exempt from CSRF: it is the one endpoint the
// refresh cookie itself is scoped to, and it doesn't rely on the access
// token cookie -- it consumes a single-use, unguessable opaque token that
// an attacker cannot obtain by riding the browser's ambient cookie jar
// alone (the refresh cookie is scoped to path=/auth/refresh but still
// requires possessing the raw token value, and reuse of any stolen token
// is caught and punished by rotation/reuse-detection).
authRouter.post(
  "/refresh",
  rateLimit({ bucket: "refresh", max: 30, windowSeconds: 60 }),
  controller.refresh
);

authRouter.post(
  "/forgot-password",
  rateLimit({
    bucket: "forgot-password",
    max: env.RATE_LIMIT_REGISTER_MAX,
    windowSeconds: env.RATE_LIMIT_REGISTER_WINDOW_SECONDS,
    keyFn: keyByEmailFromBody,
  }),
  controller.forgotPassword
);

authRouter.post("/reset-password", controller.resetPassword);

authRouter.post(
  "/change-password",
  csrfProtection,
  authenticateAccessToken,
  controller.changePassword
);
