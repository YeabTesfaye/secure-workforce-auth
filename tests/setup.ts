process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/secure_workforce_test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-at-least-32-characters-long-value";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-at-least-32-characters-long-val";
process.env.COOKIE_SECURE ??= "false";
process.env.LOGIN_FAILURE_THRESHOLD ??= "5";
process.env.LOGIN_LOCKOUT_SECONDS ??= "900";
process.env.RATE_LIMIT_LOGIN_MAX ??= "1000"; // generous in tests unless a test overrides via redis directly
process.env.RATE_LIMIT_GLOBAL_MAX ??= "10000";

import { afterAll, beforeEach } from "vitest";
import { db, closeDatabase } from "../src/infrastructure/database/client.js";
import { redis, closeRedis } from "../src/infrastructure/redis/client.js";
import {
  auditLogs,
  refreshTokens,
  sessions,
  emailVerificationTokens,
  passwordResetTokens,
  organizationMembers,
  rolePermissions,
  roles,
  projects,
  organizations,
  users,
  permissions,
} from "../db/schema/index.js";

// Truncate every table between tests (in FK-safe order) and flush Redis, so
// each test runs against a clean slate without needing a full container
// restart. Tests that need seed data (permission catalog, orgs) insert it
// themselves via helpers in tests/helpers.
beforeEach(async () => {
  await db.delete(auditLogs);
  await db.delete(refreshTokens);
  await db.delete(sessions);
  await db.delete(emailVerificationTokens);
  await db.delete(passwordResetTokens);
  await db.delete(projects);
  await db.delete(organizationMembers);
  await db.delete(rolePermissions);
  await db.delete(roles);
  await db.delete(organizations);
  await db.delete(users);
  await db.delete(permissions);
  await redis.flushdb();
});

afterAll(async () => {
  await closeDatabase();
  await closeRedis();
});
