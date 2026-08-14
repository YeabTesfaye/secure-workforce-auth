import { db, closeDatabase } from "../src/infrastructure/database/client.js";
import {
  permissions,
  users,
  organizations,
  roles,
  rolePermissions,
  organizationMembers,
  projects,
  type User,
} from "./schema/index.js";
import { hashPassword } from "../src/infrastructure/crypto/password.js";
import { ALL_PERMISSIONS, PERMISSIONS, SYSTEM_ROLES } from "../src/shared/utils/permissions-catalog.js";
import { eq } from "drizzle-orm";

const DEMO_PASSWORD = "DemoPassword123!";

// Descriptions shown in the permission catalog API/docs.
const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.ORGANIZATION_READ]: "View organization details",
  [PERMISSIONS.ORGANIZATION_UPDATE]: "Update organization settings",
  [PERMISSIONS.ORGANIZATION_DELETE]: "Delete the organization",
  [PERMISSIONS.MEMBERS_READ]: "View organization members",
  [PERMISSIONS.MEMBERS_CREATE]: "Add new members",
  [PERMISSIONS.MEMBERS_UPDATE]: "Change a member's role",
  [PERMISSIONS.MEMBERS_DELETE]: "Remove members",
  [PERMISSIONS.ROLES_READ]: "View roles and permissions",
  [PERMISSIONS.ROLES_MANAGE]: "Create, update, and delete roles",
  [PERMISSIONS.BILLING_MANAGE]: "Manage billing and subscription",
  [PERMISSIONS.PROJECTS_READ]: "View projects",
  [PERMISSIONS.PROJECTS_CREATE]: "Create projects",
  [PERMISSIONS.PROJECTS_UPDATE]: "Update projects",
  [PERMISSIONS.PROJECTS_DELETE]: "Delete projects",
  [PERMISSIONS.PROFILE_READ]: "View own profile",
  [PERMISSIONS.PROFILE_UPDATE]: "Update own profile",
  [PERMISSIONS.AUDIT_LOGS_READ]: "View security audit logs",
};

async function seedPermissionCatalog() {
  for (const key of ALL_PERMISSIONS) {
    const [resource, action] = key.split(":");
    await db
      .insert(permissions)
      .values({ key, resource, action, description: PERMISSION_DESCRIPTIONS[key] })
      .onConflictDoNothing({ target: permissions.key });
  }
  console.log(`Seeded ${ALL_PERMISSIONS.length} permissions.`);
}

// Users are shared across organizations in the demo data (Alice belongs to
// both Acme and Startup Inc, per the brief's multi-org example), so this
// looks the user up by email first rather than blindly inserting -- a plain
// insert would violate the users.email unique constraint on the second org.
async function getOrCreateUser(email: string, fullName: string): Promise<User> {
  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return existing;

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [created] = await db
    .insert(users)
    .values({ email, passwordHash, fullName, emailVerified: true })
    .returning();
  return created;
}

interface MemberSpec {
  email: string;
  fullName: string;
  role: keyof typeof SYSTEM_ROLES;
}

interface ProjectSpec {
  name: string;
  managerEmail?: string;
}

interface OrgSpec {
  name: string;
  slug: string;
  members: MemberSpec[];
  projectsList?: ProjectSpec[];
}

// Seeds one organization end-to-end: the org row, its four system roles
// with the correct permission grants, membership for each listed user
// (creating the user first if they don't already exist from a prior org),
// and any demo projects. Idempotent per org slug, so re-running the seed
// script is safe.
async function seedOrganization(spec: OrgSpec) {
  const [existingOrg] = await db.select().from(organizations).where(eq(organizations.slug, spec.slug));
  if (existingOrg) {
    console.log(`${spec.name} demo data already exists, skipping.`);
    return;
  }

  const [org] = await db.insert(organizations).values({ name: spec.name, slug: spec.slug }).returning();

  const allPermissionRows = await db.select().from(permissions);
  const permByKey = new Map(allPermissionRows.map((p) => [p.key, p.id]));
  const roleIdByName = new Map<string, string>();

  for (const [roleName, permKeys] of Object.entries(SYSTEM_ROLES)) {
    const [role] = await db
      .insert(roles)
      .values({ organizationId: org.id, name: roleName, isSystem: true })
      .returning();
    roleIdByName.set(roleName, role.id);

    const grants = permKeys
      .map((k) => permByKey.get(k))
      .filter((id): id is string => Boolean(id))
      .map((permissionId) => ({ roleId: role.id, permissionId }));
    if (grants.length > 0) await db.insert(rolePermissions).values(grants);
  }

  const userIdByEmail = new Map<string, string>();
  for (const member of spec.members) {
    const user = await getOrCreateUser(member.email, member.fullName);
    userIdByEmail.set(member.email, user.id);

    await db.insert(organizationMembers).values({
      userId: user.id,
      organizationId: org.id,
      roleId: roleIdByName.get(member.role)!,
    });
  }

  if (spec.projectsList?.length) {
    await db.insert(projects).values(
      spec.projectsList.map((p) => ({
        organizationId: org.id,
        name: p.name,
        managerId: p.managerEmail ? userIdByEmail.get(p.managerEmail) : undefined,
      }))
    );
  }

  console.log(`Seeded ${spec.name}:`);
  console.log(`  Organization: ${org.name} (${org.id})`);
  for (const member of spec.members) {
    console.log(`  ${member.fullName.padEnd(20)} (${member.role.padEnd(15)}) ${member.email} / ${DEMO_PASSWORD}`);
  }
}

async function main() {
  await seedPermissionCatalog();

  // Acme Corporation -- the primary demo scenario from the project brief
  // (Carol logs in, tries to change org settings -> 403; Bob updates a
  // project he manages -> 200; Alice demotes Bob -> his access changes).
  await seedOrganization({
    name: "Acme Corporation",
    slug: "acme-corporation",
    members: [
      { email: "alice@acme.com", fullName: "Alice Owner", role: "OWNER" },
      { email: "bob@acme.com", fullName: "Bob Manager", role: "MANAGER" },
      { email: "carol@acme.com", fullName: "Carol Employee", role: "EMPLOYEE" },
      { email: "david@acme.com", fullName: "David HR Admin", role: "HR_ADMINISTRATOR" },
    ],
    projectsList: [
      { name: "Website Redesign", managerEmail: "bob@acme.com" },
      { name: "Payroll Migration", managerEmail: "bob@acme.com" },
    ],
  });

  // Startup Inc -- a second, unrelated tenant. Alice is reused here as an
  // EMPLOYEE (matching the brief's "Alice belongs to multiple orgs with
  // different roles in each" example), and Erin is a fresh user who owns
  // this org but has zero access to Acme. Useful for manually exercising
  // tenant isolation: log in as Erin and confirm /organizations/{acmeId}
  // returns 403, or log in as Alice and confirm her role/permissions
  // differ between the two orgs.
  await seedOrganization({
    name: "Startup Inc",
    slug: "startup-inc",
    members: [
      { email: "erin@startupinc.com", fullName: "Erin Founder", role: "OWNER" },
      { email: "alice@acme.com", fullName: "Alice Owner", role: "EMPLOYEE" },
    ],
    projectsList: [{ name: "MVP Launch", managerEmail: "erin@startupinc.com" }],
  });

  await closeDatabase();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});