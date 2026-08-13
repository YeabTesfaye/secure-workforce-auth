import { pgTable, uuid, varchar, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";

// A session represents one logged-in device/browser. Revoking a session
// revokes its entire refresh token family, killing the device immediately.
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userAgent: varchar("user_agent", { length: 512 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    // Best-effort human label derived from user agent, e.g. "Chrome on macOS".
    deviceLabel: varchar("device_label", { length: 255 }),
    revoked: boolean("revoked").notNull().default(false),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    lastActiveAt: timestamp("last_active_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)]
);

// Refresh tokens form a rotation chain ("family"). Only the token whose hash
// matches `tokenHash` and is not yet used/revoked is valid. On successful
// rotation, this row is marked used and a new row with the same familyId
// is inserted. If a *used* or *revoked* token is presented again, that's
// reuse -> the whole family (and its session) gets revoked.
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    familyId: uuid("family_id").notNull(),
    // SHA-256 hash of the raw token. Raw token is never persisted.
    tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
    used: boolean("used").notNull().default(false),
    usedAt: timestamp("used_at", { withTimezone: true }),
    revoked: boolean("revoked").notNull().default(false),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    replacedByTokenId: uuid("replaced_by_token_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    index("refresh_tokens_family_idx").on(table.familyId),
    index("refresh_tokens_session_idx").on(table.sessionId),
  ]
);

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  refreshTokens: many(refreshTokens),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  session: one(sessions, { fields: [refreshTokens.sessionId], references: [sessions.id] }),
}));

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;
