import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { rolePermissions } from "./roles.js";

// Permissions are global (not org-scoped): "organization:update", "members:create",
// "billing:manage", "projects:update", "profile:read", etc. Roles compose them.
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 150 }).notNull().unique(), // e.g. "projects:update"
  resource: varchar("resource", { length: 100 }).notNull(), // e.g. "projects"
  action: varchar("action", { length: 100 }).notNull(), // e.g. "update"
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export type Permission = typeof permissions.$inferSelect;
export type NewPermission = typeof permissions.$inferInsert;
