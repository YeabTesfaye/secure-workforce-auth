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

| User  | Role            | Email             | Password            |
|-------|-----------------|--------------------|----------------------|
| Alice | OWNER           | alice@acme.com     | DemoPassword123!    |
| Bob   | MANAGER         | bob@acme.com       | DemoPassword123!    |
| Carol | EMPLOYEE        | carol@acme.com     | DemoPassword123!    |
| David | HR_ADMINISTRATOR| david@acme.com     | DemoPassword123!    |

## Testing

```bash
npm test                 # everything
npm run test:unit        # crypto, JWT, permission-catalog unit tests
npm run test:integration # full HTTP flows: register/login/refresh, multi-tenant RBAC
npm run test:security    # refresh-token reuse detection, brute-force lockout, CSRF
```

Tests run against real Postgres + Redis (see `docker-compose.yml` / CI workflow), not mocks, because the properties being tested (tenant isolation, token rotation, lockout) are exactly the properties that mocking would hide bugs in.

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
