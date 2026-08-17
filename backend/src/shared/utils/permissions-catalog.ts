// Single source of truth for the permission catalog and the default system
// roles that every new organization is seeded with. Both db/seed.ts and the
// role-management module import from here so the "what permissions exist"
// question never drifts between seed data and application logic.
export const PERMISSIONS = {
  ORGANIZATION_READ: "organization:read",
  ORGANIZATION_UPDATE: "organization:update",
  ORGANIZATION_DELETE: "organization:delete",

  MEMBERS_READ: "members:read",
  MEMBERS_CREATE: "members:create",
  MEMBERS_UPDATE: "members:update",
  MEMBERS_DELETE: "members:delete",

  ROLES_READ: "roles:read",
  ROLES_MANAGE: "roles:manage",

  BILLING_MANAGE: "billing:manage",

  PROJECTS_READ: "projects:read",
  PROJECTS_CREATE: "projects:create",
  PROJECTS_UPDATE: "projects:update",
  PROJECTS_DELETE: "projects:delete",

  PROFILE_READ: "profile:read",
  PROFILE_UPDATE: "profile:update",

  AUDIT_LOGS_READ: "audit_logs:read",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

// Default system roles seeded for every new organization. `isSystem: true`
// roles cannot be deleted or renamed (see roles module), but the org owner
// can still create additional custom roles composed from the same catalog.
export const SYSTEM_ROLES: Record<string, PermissionKey[]> = {
  OWNER: [
    PERMISSIONS.ORGANIZATION_READ,
    PERMISSIONS.ORGANIZATION_UPDATE,
    PERMISSIONS.ORGANIZATION_DELETE,
    PERMISSIONS.MEMBERS_READ,
    PERMISSIONS.MEMBERS_CREATE,
    PERMISSIONS.MEMBERS_UPDATE,
    PERMISSIONS.MEMBERS_DELETE,
    PERMISSIONS.ROLES_READ,
    PERMISSIONS.ROLES_MANAGE,
    PERMISSIONS.BILLING_MANAGE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_CREATE,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.PROJECTS_DELETE,
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.AUDIT_LOGS_READ,
  ],
  HR_ADMINISTRATOR: [
    PERMISSIONS.MEMBERS_READ,
    PERMISSIONS.MEMBERS_UPDATE,
    PERMISSIONS.ORGANIZATION_READ,
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
  ],
  MANAGER: [
    PERMISSIONS.MEMBERS_READ,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.PROJECTS_UPDATE,
    PERMISSIONS.ORGANIZATION_READ,
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
  ],
  EMPLOYEE: [
    PERMISSIONS.PROFILE_READ,
    PERMISSIONS.PROFILE_UPDATE,
    PERMISSIONS.PROJECTS_READ,
    PERMISSIONS.ORGANIZATION_READ,
  ],
};
