import { db } from "../../infrastructure/database/client.js";
import { projects } from "../../../db/schema/index.js";
import { eq } from "drizzle-orm";
import { NotFoundError } from "../../shared/errors/app-error.js";

export async function listProjects(organizationId: string) {
  return db.select().from(projects).where(eq(projects.organizationId, organizationId));
}

export async function createProject(organizationId: string, name: string, managerId?: string) {
  const [project] = await db.insert(projects).values({ organizationId, name, managerId }).returning();
  return project;
}

export async function updateProject(projectId: string, input: { name?: string; managerId?: string }) {
  const [updated] = await db
    .update(projects)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(projects.id, projectId))
    .returning();
  if (!updated) throw new NotFoundError("Project not found");
  return updated;
}
