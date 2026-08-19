import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env, isProduction } from "./config/env.js";
import { requestId } from "./middleware/request-id.js";
import { errorHandler } from "./middleware/error-handler.js";
import { rateLimit } from "./middleware/rate-limit.js";
import { requestTimeout } from "./middleware/request-timeout.js";
import { sanitizeInput } from "./middleware/sanitize-input.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { sessionsRouter } from "./modules/sessions/sessions.routes.js";
import { organizationsRouter } from "./modules/organizations/organizations.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Security-relevant middleware order matters: request ID first (so every
  // downstream log/error carries it), then hardening headers, then parsers,
  // then global rate limiting, then routes, then the error handler last.
  app.use(requestId);

  // Helmet with production-grade CSP and HSTS configuration.
  // CSP is permissive in dev to allow HMR; tightened in production.
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:", "https:"],
              connectSrc: ["'self'"],
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              frameAncestors: ["'none'"],
              baseUri: ["'self'"],
              formAction: ["'self'"],
            },
          }
        : false, // Disabled in dev to allow dev tooling
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      crossOriginEmbedderPolicy: false, // Allow embedding for Swagger UI
    })
  );

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      exposedHeaders: ["x-request-id"],
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-ID"],
      maxAge: 86400, // Preflight cache for 24 hours
    })
  );
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use(morgan(isProduction ? "combined" : "dev"));

  // Input sanitization — strip XSS-prone characters from string fields
  app.use(sanitizeInput);

  // Global rate limiting
  app.use(
    rateLimit({
      bucket: "global",
      max: env.RATE_LIMIT_GLOBAL_MAX,
      windowSeconds: env.RATE_LIMIT_GLOBAL_WINDOW_SECONDS,
    })
  );

  // Request timeout — prevent resource exhaustion from hanging queries
  app.use(requestTimeout);

  app.get("/health", (_req, res) =>
    res.json({ status: "ok", timestamp: new Date().toISOString() })
  );

  try {
    const openApiDocument = YAML.load(path.join(__dirname, "..", "docs", "openapi.yaml"));
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  } catch {
    // OpenAPI spec not present (e.g. not yet generated in this environment).
    // The API itself must not fail to boot just because docs are missing.
  }

  app.use("/auth", authRouter);
  app.use("/users", usersRouter);
  app.use("/sessions", sessionsRouter);
  app.use("/organizations", organizationsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" }, requestId: req.requestId });
  });

  app.use(errorHandler);

  return app;
}
