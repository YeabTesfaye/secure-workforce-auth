# Architecture

## System overview

```text
                    ┌─────────────────────┐
                    │   Next.js Demo       │
                    │  (secure-workforce-  │
                    │       demo/)         │
                    └──────────┬──────────┘
                               │ HTTP/HTTPS
                               ▼
                    ┌─────────────────────┐
                    │    Express API       │
                    ├─────────────────────┤
                    │ Validation (Zod)     │
                    │ Authentication       │
                    │ Authorization        │
                    │ Rate Limiting        │
                    │ Audit Logging        │
                    └──────┬─────────┬────┘
                           │         │
                    ┌──────▼───┐ ┌──▼──────┐
                    │PostgreSQL│ │  Redis  │
                    │ (Drizzle)│ │         │
                    └──────────┘ └─────────┘
```

The Next.js demo client is optional and entirely separate from the backend's authority: it calls the public HTTP API exactly like any other consumer would, holds no authentication or authorization logic of its own, and every permission decision it reflects in the UI is only ever a reflection of what the API already allowed or rejected -- see `secure-workforce-demo/README.md`.

## Module layout

```
src/
├── modules/          feature modules: auth, users, sessions, organizations,
│                     members, roles, permissions, audit -- each with its own
│                     service (business logic), schemas (Zod), routes/controller
├── infrastructure/   database, redis, email, crypto -- adapters around
│                     external systems, no business logic
├── middleware/        authentication, authorization, rate-limit, csrf,
│                     error-handler, request-id -- cross-cutting concerns
├── config/           Zod-validated environment configuration
├── shared/           errors, types, and the permission catalog (single
│                     source of truth for RBAC)
├── app.ts            Express app assembly (middleware pipeline + routes)
└── server.ts         process entrypoint, graceful shutdown
```

Each module keeps controllers thin: parse input with Zod, call the service, shape the response. All business logic and DB access lives in `*.service.ts`. This is a deliberate choice over a repository-abstraction layer -- Drizzle queries are already a thin, typed abstraction over SQL, and adding another layer on top would hide rather than clarify what each operation actually does to the database.

## Authorization pipeline

```text
Request
   ↓
Authentication        -- verify JWT, check tokenVersion + session validity
   ↓
Tenant Resolution      -- resolve :organizationId, confirm real membership
   ↓
Permission Check       -- does the caller's role grant this permission (RBAC)
   ↓
Resource-Level Authorization  -- is the caller authorized for THIS resource
   ↓
Controller
   ↓
Audit Event
```

This is implemented as four separate, composable middleware functions rather than one monolithic check, so each route only pays for the layers it actually needs (e.g. `GET /health` has none of them; `PATCH /organizations/:id/projects/:projectId` has all four):

## Request pipeline

```
HTTP Request
     │
     ▼
requestId            -- every request gets a correlation ID
     │
     ▼
helmet / cors         -- security headers, CORS policy
     │
     ▼
rateLimit (global)     -- Redis-backed fixed-window limiter
     │
     ▼
route-specific rateLimit (login, register, forgot-password)
     │
     ▼
csrfProtection          -- only for cookie-authenticated mutations
     │
     ▼
authenticateAccessToken -- verifies JWT, checks tokenVersion + session validity
     │
     ▼
loadOrgContext          -- resolves org membership, attaches permission set
     │
     ▼
requirePermission(...)  -- RBAC gate
     │
     ▼
requireProjectAccess    -- resource-level gate (where applicable)
     │
     ▼
controller -> service -> Postgres / Redis
     │
     ▼
audit event recorded (where security-relevant)
     │
     ▼
errorHandler (last, catches everything)
```

## Data model

```
users ──< organization_members >── organizations
                  │                      │
                  ▼                      ▼
                roles ──< role_permissions >── permissions
                  │
                  ▼
             (role assigned per membership, org-scoped)

users ──< sessions ──< refresh_tokens   (rotation families via family_id)
users ──< email_verification_tokens
users ──< password_reset_tokens
(users, organizations) ──< audit_logs
organizations ──< projects >── users (manager assignment)
```

Key design decisions:

- **Permissions are global, roles are org-scoped.** `projects:update` means the same thing everywhere; which roles grant it is decided per-organization. This lets every org get sensible defaults (`SYSTEM_ROLES` in `permissions-catalog.ts`) while still supporting custom roles per org.
- **`users.tokenVersion` is a UUID, bumped on password change/reset.** Access tokens embed the version at issuance time; a mismatch on any subsequent request means the token predates a security-relevant change and is rejected, even though it hasn't technically expired yet.
- **Refresh tokens are never stored raw**, only their SHA-256 hash -- mirroring how passwords are never stored raw, for the same reason (a DB read alone should not be enough to impersonate a user).
- **`family_id` on refresh_tokens** is what makes rotation and reuse detection possible: every token minted during a session's lifetime shares one family ID, so revoking "the family" revokes every past and future token derived from that login, in one update.

## Why Express (not a full framework)

The project brief calls this out explicitly: Express is used so the code demonstrates backend security architecture directly rather than delegating structure to a framework's conventions. Every middleware in the auth pipeline above is hand-written and auditable in this repository.
