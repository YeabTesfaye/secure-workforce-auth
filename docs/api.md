# API Reference

Full machine-readable spec: `docs/openapi.yaml`, served interactively at `/docs`. This is a human-readable summary.

All responses are JSON, shaped as `{ "data": ... }` on success or `{ "error": { "code", "message", "details"? }, "requestId" }` on failure. Cookie-authenticated clients must echo the `csrf_token` cookie value in an `X-CSRF-Token` header on every mutating request (see `docs/security.md`).

## Authentication -- `/auth`

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/auth/register` | none | Rate limited per-IP. Returns 409 if email taken. |
| POST | `/auth/verify-email` | none | Body: `{ token }` |
| POST | `/auth/login` | none | Rate limited per-IP and per-email. Sets `access_token`, `refresh_token`, `csrf_token` cookies. 423 if locked out. |
| POST | `/auth/logout` | cookie or bearer | CSRF-protected for cookie clients. Revokes the current session. |
| POST | `/auth/refresh` | refresh cookie | Rotates the refresh token; reuse of a stale token revokes the whole session. |
| POST | `/auth/forgot-password` | none | Always returns a generic success message. |
| POST | `/auth/reset-password` | none | Body: `{ token, newPassword }`. Revokes all sessions on success. |
| POST | `/auth/change-password` | cookie or bearer | CSRF-protected. Revokes all *other* sessions. |

## Users -- `/users`

| Method | Path | Auth | Permission |
|---|---|---|---|
| GET | `/users/me` | required | none beyond authentication |
| PATCH | `/users/me` | required | none beyond authentication (CSRF-protected) |

## Sessions -- `/sessions`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/sessions` | required | Lists the caller's active sessions with device labels. |
| DELETE | `/sessions/:id` | required | CSRF-protected. Revokes one session + its refresh family. |
| DELETE | `/sessions/all` | required | CSRF-protected. Revokes every session except the current one. |

## Organizations -- `/organizations`

| Method | Path | Permission |
|---|---|---|
| GET | `/organizations` | member (lists caller's orgs) |
| POST | `/organizations` | authenticated (creates org, caller becomes OWNER) |
| GET | `/organizations/:id` | `organization:read` |
| PATCH | `/organizations/:id` | `organization:update` |
| DELETE | `/organizations/:id` | `organization:delete` |

## Members -- `/organizations/:id/members`

| Method | Path | Permission |
|---|---|---|
| GET | `/` | `members:read` |
| POST | `/` | `members:create` |
| PATCH | `/:userId` | `members:update` (revokes target's sessions on role change) |
| DELETE | `/:userId` | `members:delete` |

## Roles -- `/organizations/:id/roles`

| Method | Path | Permission |
|---|---|---|
| GET | `/` | `roles:read` |
| POST | `/` | `roles:manage` |
| PATCH | `/:roleId` | `roles:manage` (system roles rejected with 403) |
| DELETE | `/:roleId` | `roles:manage` (system roles, or roles still assigned, rejected) |

## Permissions -- `/organizations/:id/permissions`

| Method | Path | Permission |
|---|---|---|
| GET | `/` | `roles:read` -- returns the global permission catalog |

## Projects -- `/organizations/:id/projects`

Demonstrates resource-level authorization on top of RBAC.

| Method | Path | Permission | Notes |
|---|---|---|---|
| GET | `/` | `projects:read` | |
| POST | `/` | `projects:create` | |
| PATCH | `/:projectId` | `projects:update` **and** (OWNER or assigned manager) | 403 if role allows updates in general but caller isn't assigned to this project |

## Audit logs -- `/organizations/:id/audit-logs`

| Method | Path | Permission | Query params |
|---|---|---|---|
| GET | `/` | `audit_logs:read` | `userId`, `event`, `startDate`, `endDate`, `limit`, `offset` |
