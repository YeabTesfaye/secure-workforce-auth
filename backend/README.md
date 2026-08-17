# SecureWorkforce Auth Platform

A production-style, multi-tenant authentication and authorization service for a workforce management SaaS platform. Built to demonstrate security-critical backend infrastructure, not another JWT tutorial project.

## Stack

Node.js, TypeScript, Express, PostgreSQL (Drizzle ORM), Redis, Zod, Argon2id, Vitest/Supertest, Docker.

## Quick start

```bash
cp .env.example .env
# generate real secrets:
# openssl rand -hex 64   (paste into JWT_ACCESS_SECRET and JWT_REFRESH_SECRET)

docker compose up -d postgres redis
npm install
npm run db:generate
npm run db:migrate
npm run db:seed      # seeds permission catalog + Acme Corp demo (Alice/Bob/Carol/David)
npm run dev
```

API is at `http://localhost:4000`, docs at `http://localhost:4000/docs`, health check at `/health`.

Or run everything in containers: `docker compose up --build`.

## Demo credentials (after `npm run db:seed`)

**Acme Corporation** (`acme-corporation`)

| User  | Role            | Email             | Password            |
|-------|-----------------|--------------------|----------------------|
| Alice | OWNER           | alice@acme.com     | DemoPassword123!    |
| Bob   | MANAGER         | bob@acme.com       | DemoPassword123!    |
| Carol | EMPLOYEE        | carol@acme.com     | DemoPassword123!    |
| David | HR_ADMINISTRATOR| david@acme.com     | DemoPassword123!    |

**Startup Inc** (`startup-inc`) — a second, unrelated tenant, useful for manually testing cross-tenant isolation

| User  | Role            | Email                  | Password            |
|-------|-----------------|--------------------------|----------------------|
| Erin  | OWNER           | erin@startupinc.com     | DemoPassword123!    |
| Alice | EMPLOYEE        | alice@acme.com           | DemoPassword123!    |

Alice is deliberately reused across both orgs (OWNER at Acme, EMPLOYEE at Startup Inc) to demonstrate that role and permissions are resolved per-organization, not globally per-user. Log in as Alice, hit `/organizations` to see both, and compare what `/organizations/:id/permissions` returns for each `:id`. Log in as Erin and confirm `GET /organizations/:acmeOrgId` returns 403 — she has zero membership there.

## Testing

```bash
npm test                 # everything (67 tests at time of writing)
npm run test:unit        # crypto, JWT, permission-catalog unit tests (16)
npm run test:integration # full HTTP flows: register/login/refresh, multi-tenant RBAC (10)
npm run test:security    # cross-tenant, RBAC bypass, session revocation, refresh reuse, brute force, CSRF, password reset (41)
```

Tests run against real Postgres + Redis (see `docker-compose.yml` / CI workflow), not mocks, because the properties being tested (tenant isolation, token rotation, lockout) are exactly the properties that mocking would hide bugs in. This isn't a theoretical claim -- `npm test` was run against a live Postgres/Redis pair during development and caught a real bug: a query aliasing mistake in `GET /organizations` that leaked raw role UUIDs instead of human-readable role names, fixed with an accompanying regression test in `tests/integration/multi-tenant-rbac.test.ts`.

## Security Demonstrations

Every security property claimed in this README is backed by an executable test, not just documentation. See [`docs/security.md`](docs/security.md) for the full Attack → Defense → Test breakdown and the current security test matrix. Summary:

```text
Security Property                     Status
------------------------------------------------
Cross-tenant isolation                PASS
RBAC enforcement                      PASS
Resource-level authorization          PASS
Refresh-token rotation                PASS
Refresh-token reuse detection         PASS
Session revocation                    PASS
Brute-force protection                PASS
Account lockout                       PASS
CSRF protection                       PASS
Password-reset invalidation           PASS
Authentication bypass protection      PASS
```

Each row maps to specific test files in `tests/security/` -- open the linked doc to see exactly which test proves which property.

## Session Management

Sessions are created at login and represent one device/browser. Each session owns a chain ("family") of refresh tokens: every `/auth/refresh` call consumes the presented token and issues a new one in the same family, and presenting an already-used token is treated as theft evidence -- the entire family and session are revoked immediately (see `docs/security.md`).

```http
GET    /sessions            list active sessions, with device/IP/last-active metadata and a current-session flag
DELETE /sessions/:id        revoke one session (kills its refresh token family too)
DELETE /sessions/all        revoke every OTHER session, keeping the caller logged in
```

Revoking a session takes effect immediately: the next request bearing that session's access token gets 401 (via the session-existence check in `authenticateAccessToken`), and its refresh token is rejected too. A user can never revoke another user's session, even by guessing a valid session ID (the lookup is scoped by `userId AND sessionId` together, not `sessionId` alone) -- see `tests/security/session-revocation.test.ts`.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full system diagram (API ↔ Postgres/Redis ↔ optional demo client), module layout, and the four-stage authorization pipeline (Authentication → Tenant Resolution → Permission Check → Resource-Level Authorization) that every organization-scoped route runs through.

## Demo Application

An optional Next.js client lives in the sibling `secure-workforce-demo/` directory. It is a pure API consumer -- no authentication or authorization logic lives in the frontend; every permission decision it reflects is just displaying what the API already allowed or rejected. To run it:

```bash
cd secure-workforce-demo
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL to your running backend
npm install
npm run dev
```

Then open `http://localhost:3000` and log in with any seeded demo account (see above). See `secure-workforce-demo/README.md` for details on what each screen demonstrates.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — module layout, request pipeline, data model
- [`docs/security.md`](docs/security.md) — every security control and why it's implemented the way it is
- [`docs/threat-model.md`](docs/threat-model.md) — threats considered and their mitigations
- [`docs/api.md`](docs/api.md) — endpoint reference
- `docs/openapi.yaml` — machine-readable spec, served at `/docs` via Swagger UI

## What this proves

This project demonstrates the ability to design and implement security-critical backend infrastructure for a multi-tenant SaaS application: authentication, authorization, RBAC, fine-grained resource-level permissions, multi-tenancy with real tenant isolation, session management, refresh-token rotation with reuse detection, password security, account protection, rate limiting, CSRF, audit logging, and threat modeling — backed by integration and security tests, not just described in a README.

## Optional demo client

No frontend ships with the core deliverable by design (see the project brief). A minimal Next.js consumer can be built separately in a sibling `secure-workforce-demo/` repo that only talks to this API over HTTP — it must never contain authentication business logic itself.
