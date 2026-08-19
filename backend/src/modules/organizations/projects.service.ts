import { db } from "../../infrastructure/database/client.js";
import { projects, organizationMembers } from "../../../db/schema/index.js";
import { and, eq, count } from "drizzle-orm";
import { NotFoundError, ValidationError } from "../../shared/errors/app-error.js";

// managerId must belong to a real member of THIS organization -- otherwise
// requireProjectAccess's "is the caller the assigned manager" check would
// be comparing against a user who could never actually pass it (or worse,
// against a user from a completely unrelated org whose id happened to be
// guessed/reused), silently creating an unreachable or confused assignment.
async function assertIsOrgMember(organizationId: string, userId: string) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, userId), eq(organizationMembers.organizationId, organizationId)))
    .limit(1);
  if (!membership) {
    throw new ValidationError("managerId must belong to a member of this organization");
  }
}

export async function listProjects(organizationId: string, limit: number, offset: number) {
  const [totalRow] = await db
    .select({ total: count() })
    .from(projects)
    .where(eq(projects.organizationId, organizationId));

  const data = await db
    .select()
    .from(projects)
    .where(eq(projects.organizationId, organizationId))
    .limit(limit)
    .offset(offset);

  return { data, total: totalRow?.total ?? 0 };
}

export async function createProject(organizationId: string, name: string, managerId?: string) {
  if (managerId) await assertIsOrgMember(organizationId, managerId);
  const [project] = await db.insert(projects).values({ organizationId, name, managerId }).returning();
  return project;
}

export async function updateProject(
  organizationId: string,
  projectId: string,
  input: { name?: string; managerId?: string }
) {
  if (input.managerId) await assertIsOrgMember(organizationId, input.managerId);

  const [updated] = await db
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(projects.id, projectId), eq(projects.organizationId, organizationId)))
    .returning();
  if (!updated) throw new NotFoundError("Project not found");
  return updated;
}
