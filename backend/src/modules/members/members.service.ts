import { db } from "../../infrastructure/database/client.js";
import { organizationMembers, users, roles } from "../../../db/schema/index.js";
import { and, eq, count } from "drizzle-orm";
import { NotFoundError, ConflictError, ValidationError } from "../../shared/errors/app-error.js";
import { recordSecurityEvent } from "../audit/audit.service.js";
import { revokeAllSessions } from "../sessions/sessions.service.js";

export async function listMembers(organizationId: string, limit: number, offset: number) {
  const [totalRow] = await db
    .select({ total: count() })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, organizationId));

  const data = await db
    .select({
      membershipId: organizationMembers.id,
      userId: users.id,
      email: users.email,
      fullName: users.fullName,
      roleId: roles.id,
      roleName: roles.name,
      createdAt: organizationMembers.createdAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(organizationMembers.userId, users.id))
    .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
    .where(eq(organizationMembers.organizationId, organizationId))
    .limit(limit)
    .offset(offset);

  return { data, total: totalRow?.total ?? 0 };
}

// Adds an existing user to the org by email. (Full invite-by-email-with-token
// flow is a natural extension; this covers the core "add member" contract.)
export async function addMember(
  organizationId: string,
  email: string,
  roleId: string,
  ctx: { invitedBy: string; ip?: string; userAgent?: string }
) {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new NotFoundError("No user found with that email");

  const [role] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, roleId), eq(roles.organizationId, organizationId)))
    .limit(1);
  if (!role) throw new ValidationError("Role does not belong to this organization");

  const [existing] = await db
    .select()
    .from(organizationMembers)
    .where(and(eq(organizationMembers.userId, user.id), eq(organizationMembers.organizationId, organizationId)))
    .limit(1);
  if (existing) throw new ConflictError("User is already a member of this organization");

  const [membership] = await db
    .insert(organizationMembers)
    .values({ userId: user.id, organizationId, roleId, invitedBy: ctx.invitedBy })
    .returning();

  await recordSecurityEvent({
    event: "MEMBER_INVITED",
    userId: ctx.invitedBy,
    organizationId,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: { targetUserId: user.id, roleId },
  });

  return membership;
}

export async function updateMemberRole(
  organizationId: string,
  targetUserId: string,
  newRoleId: string,
  ctx: { actorUserId: string; ip?: string; userAgent?: string }
) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.userId, targetUserId), eq(organizationMembers.organizationId, organizationId))
    )
    .limit(1);
  if (!membership) throw new NotFoundError("Membership not found");

  const [newRole] = await db
    .select()
    .from(roles)
    .where(and(eq(roles.id, newRoleId), eq(roles.organizationId, organizationId)))
    .limit(1);
  if (!newRole) throw new ValidationError("Role does not belong to this organization");

  const oldRoleId = membership.roleId;

  await db
    .update(organizationMembers)
    .set({ roleId: newRoleId, updatedAt: new Date() })
    .where(eq(organizationMembers.id, membership.id));

  // A role downgrade must take effect immediately, not just on next token
  // refresh -- revoking sessions forces re-authentication under the new
  // role. (Permissions are also re-resolved fresh per request regardless,
  // this is belt-and-suspenders for the demo scenario in the spec.)
  await revokeAllSessions(targetUserId);

  await recordSecurityEvent({
    event: "ROLE_CHANGED",
    userId: ctx.actorUserId,
    organizationId,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: { targetUserId, oldRoleId, newRoleId },
  });
}

export async function removeMember(
  organizationId: string,
  targetUserId: string,
  ctx: { actorUserId: string; ip?: string; userAgent?: string }
) {
  const [membership] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(eq(organizationMembers.userId, targetUserId), eq(organizationMembers.organizationId, organizationId))
    )
    .limit(1);
  if (!membership) throw new NotFoundError("Membership not found");

  await db.delete(organizationMembers).where(eq(organizationMembers.id, membership.id));
  await revokeAllSessions(targetUserId);

  await recordSecurityEvent({
    event: "MEMBER_REMOVED",
    userId: ctx.actorUserId,
    organizationId,
    ipAddress: ctx.ip,
    userAgent: ctx.userAgent,
    metadata: { targetUserId },
  });
}
