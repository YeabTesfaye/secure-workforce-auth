import { pgTable, uuid, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./users.js";
import { organizations } from "./organizations.js";

// The full catalog of security-relevant event types. Kept as a plain string
// union (not a pg enum) so new event types don't require a migration.
export const SECURITY_EVENTS = [
  "USER_REGISTERED",
  "EMAIL_VERIFIED",
  "LOGIN_SUCCESS",
  "LOGIN_FAILED",
  "ACCOUNT_LOCKED",
  "ACCOUNT_DISABLED",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET_REQUESTED",
  "PASSWORD_RESET",
  "SESSION_CREATED",
  "SESSION_REVOKED",
  "REFRESH_TOKEN_ROTATED",
  "REFRESH_TOKEN_REUSE_DETECTED",
  "ROLE_CHANGED",
  "PERMISSION_CHANGED",
  "MEMBER_INVITED",
  "MEMBER_REMOVED",
  "ORGANIZATION_CREATED",
  "ORGANIZATION_UPDATED",
  "CROSS_TENANT_ACCESS_DENIED",
  "PRIVILEGE_ESCALATION_DENIED",
  "RATE_LIMIT_EXCEEDED",
] as const;

export type SecurityEventType = (typeof SECURITY_EVENTS)[number];

// One append-only table for every security-relevant event across the system.
// organizationId is nullable because some events (e.g. LOGIN_FAILED for an
// unknown email) happen before any org context exists.
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    event: varchar("event", { length: 100 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
    // Free-form structured context: e.g. { targetUserId, oldRole, newRole }
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_org_idx").on(table.organizationId),
    index("audit_logs_user_idx").on(table.userId),
    index("audit_logs_event_idx").on(table.event),
    index("audit_logs_created_idx").on(table.createdAt),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
