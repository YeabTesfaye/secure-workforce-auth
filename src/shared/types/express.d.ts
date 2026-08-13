import "express";
import type { Project } from "../../../db/schema/index.js";

// Populated by authentication middleware once the access token is verified.
export interface AuthContext {
  userId: string;
  sessionId: string;
}

// Populated by the organization-scoping middleware once a request resolves
// to a specific org (from the :organizationId route param), after confirming
// membership. Includes the caller's permission set for that org, resolved
// fresh per request (never cached in the JWT).
export interface OrgContext {
  organizationId: string;
  membershipId: string;
  roleId: string;
  roleName: string;
  permissions: Set<string>;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
      orgContext?: OrgContext;
      requestId?: string;
      project?: Project;
    }
  }
}
