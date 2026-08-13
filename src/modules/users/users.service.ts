import { db } from "../../infrastructure/database/client.js";
import { users } from "../../../db/schema/index.js";
import { eq } from "drizzle-orm";
import { NotFoundError } from "../../shared/errors/app-error.js";

export async function getUserProfile(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new NotFoundError("User not found");
  const { passwordHash: _passwordHash, tokenVersion: _tokenVersion, ...safe } = user;
  return safe;
}

export interface UpdateProfileInput {
  fullName?: string;
}

export async function updateUserProfile(userId: string, input: UpdateProfileInput) {
  const [updated] = await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning();
  if (!updated) throw new NotFoundError("User not found");
  const { passwordHash: _passwordHash, tokenVersion: _tokenVersion, ...safe } = updated;
  return safe;
}
