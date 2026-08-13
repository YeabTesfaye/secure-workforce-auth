import { db, closeDatabase } from "../src/infrastructure/database/client.js";
import { permissions, users, organizations, roles, rolePermissions, organizationMembers, projects } from "./schema/index.js";
import { hashPassword } from "../src/infrastructure/crypto/password.js";
import { ALL_PERMISSIONS, PERMISSIONS, SYSTEM_ROLES } from "../src/shared/utils/permissions-catalog.js";
import { eq } from "drizzle-orm";

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

async function seedAcmeScenario() {
  const existing = await db.select().from(organizations).where(eq(organizations.slug, "acme-corporation"));
  if (existing.length > 0) {
    console.log("Acme Corporation demo data already exists, skipping.");
    return;
  }

  const demoPassword = "DemoPassword123!";
  const passwordHash = await hashPassword(demoPassword);

  const [alice] = await db
    .insert(users)
    .values({ email: "alice@acme.com", passwordHash, fullName: "Alice Owner", emailVerified: true })
    .returning();
  const [bob] = await db
    .insert(users)
    .values({ email: "bob@acme.com", passwordHash, fullName: "Bob Manager", emailVerified: true })
    .returning();
  const [carol] = await db
    .insert(users)
    .values({ email: "carol@acme.com", passwordHash, fullName: "Carol Employee", emailVerified: true })
    .returning();
  const [david] = await db
    .insert(users)
    .values({ email: "david@acme.com", passwordHash, fullName: "David HR Admin", emailVerified: true })
    .returning();

  const [org] = await db
    .insert(organizations)
    .values({ name: "Acme Corporation", slug: "acme-corporation" })
    .returning();

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

  await db.insert(organizationMembers).values([
    { userId: alice.id, organizationId: org.id, roleId: roleIdByName.get("OWNER")! },
    { userId: bob.id, organizationId: org.id, roleId: roleIdByName.get("MANAGER")! },
    { userId: carol.id, organizationId: org.id, roleId: roleIdByName.get("EMPLOYEE")! },
    { userId: david.id, organizationId: org.id, roleId: roleIdByName.get("HR_ADMINISTRATOR")! },
  ]);

  await db.insert(projects).values([
    { organizationId: org.id, name: "Website Redesign", managerId: bob.id },
    { organizationId: org.id, name: "Payroll Migration", managerId: bob.id },
  ]);

  console.log("Seeded Acme Corporation demo scenario:");
  console.log(`  Organization: ${org.name} (${org.id})`);
  console.log(`  Alice (OWNER):    alice@acme.com / ${demoPassword}`);
  console.log(`  Bob (MANAGER):    bob@acme.com / ${demoPassword}`);
  console.log(`  Carol (EMPLOYEE): carol@acme.com / ${demoPassword}`);
  console.log(`  David (HR_ADMIN): david@acme.com / ${demoPassword}`);
}

async function main() {
  await seedPermissionCatalog();
  await seedAcmeScenario();
  await closeDatabase();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
