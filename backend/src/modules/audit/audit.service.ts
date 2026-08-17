import { db } from "../../infrastructure/database/client.js";
import { auditLogs, type SecurityEventType } from "../../../db/schema/index.js";
import { and, eq, gte, lte, desc, type SQL } from "drizzle-orm";

export interface RecordEventInput {
  event: SecurityEventType;
  userId?: string | null;
  organizationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

// Fire-and-forget-safe: callers should await this, but a failure to write
// an audit row must never be allowed to silently swallow the *original*
// operation's success/failure. Callers wrap the primary action first, then
// log; if logging itself throws we log to stderr rather than throw, since
// losing an audit trail is bad but should not 500 a login.
export async function recordSecurityEvent(input: RecordEventInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      event: input.event,
      userId: input.userId ?? null,
      organizationId: input.organizationId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      metadata: input.metadata ?? {},
    });
  } catch (err) {
    console.error("Failed to record security event", input.event, err);
  }
}

export interface AuditLogQuery {
  organizationId: string;
  userId?: string;
  event?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function queryAuditLogs(query: AuditLogQuery) {
  const conditions: SQL[] = [eq(auditLogs.organizationId, query.organizationId)];

  if (query.userId) conditions.push(eq(auditLogs.userId, query.userId));
  if (query.event) conditions.push(eq(auditLogs.event, query.event));
  if (query.startDate) conditions.push(gte(auditLogs.createdAt, query.startDate));
  if (query.endDate) conditions.push(lte(auditLogs.createdAt, query.endDate));

  return db
    .select()
    .from(auditLogs)
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(query.limit ?? 50)
    .offset(query.offset ?? 0);
}
