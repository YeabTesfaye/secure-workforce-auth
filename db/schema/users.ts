import { pgTable, uuid, varchar, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { organizationMembers } from "./memberships.js";
import { sessions } from "./sessions.js";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    // Argon2id hash. Never store or log the plaintext password.
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    fullName: varchar("full_name", { length: 255 }),

    emailVerified: boolean("email_verified").notNull().default(false),
    isDisabled: boolean("is_disabled").notNull().default(false),

    // Account lockout bookkeeping mirrors Redis counters for durability;
    // Redis is the fast path, this column is the audit-safe fallback.
    lockedUntil: timestamp("locked_until", { withTimezone: true }),

    // Bumped whenever all sessions must be invalidated (password change, etc).
    // Access tokens embed this value; a mismatch means the token is stale.
    tokenVersion: uuid("token_version").notNull().defaultRandom(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_email_idx").on(table.email)]
);

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(organizationMembers),
  sessions: many(sessions),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
