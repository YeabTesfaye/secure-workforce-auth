# SecureWorkforce Auth Platform

A production-style, multi-tenant authentication and authorization service for a workforce management SaaS platform. Built to demonstrate security-critical backend infrastructure — not another JWT tutorial project.

## What this demonstrates

- **Multi-tenant RBAC** with per-organization role scoping
- **Four-stage authorization pipeline**: Authentication → Tenant Resolution → Permission Check → Resource-Level Authorization
- **Refresh-token rotation** with reuse detection (stolen token = entire session revoked)
- **Session management** with device tracking and immediate revocation
- **Brute-force protection** with account lockout
- **CSRF defense** via double-submit cookie pattern
- **Security-hardened cookies** (HttpOnly, Secure, SameSite=Lax, path-scoped)
- **Audit logging** of every security-relevant event
- **67+ tests** running against real PostgreSQL + Redis (not mocks)

## Architecture

```
┌─────────────────────┐
│  Next.js Frontend   │  ← Thin API consumer, zero auth logic
│  (Port 3000)        │
└──────────┬──────────┘
           │ HTTP (cookie-based, credentials: include)
           ▼
┌─────────────────────┐
│  Express API        │  ← All auth/authz enforced here
│  (Port 4000)        │
└──────┬─────────┬────┘
       │         │
┌──────▼───┐ ┌──▼──────┐
│PostgreSQL│ │  Redis  │
│(Drizzle) │ │         │
└──────────┘ └─────────┘
```

### Request Pipeline

```
HTTP Request
     ↓
requestId            → correlation ID for tracing
     ↓
helmet / cors        → security headers, CORS policy
     ↓
rateLimit (global)   → Redis-backed fixed-window limiter
     ↓
route-specific rateLimit (login, register, forgot-password)
     ↓
requestTimeout       → abort if handler hangs (>30s)
     ↓
csrfProtection       → double-submit cookie (mutations only)
     ↓
authenticateAccessToken → verify JWT + session + tokenVersion
     ↓
loadOrgContext       → resolve org membership + permission set
     ↓
requirePermission()  → RBAC gate
     ↓
requireProjectAccess → resource-level gate (where applicable)
     ↓
controller → service → PostgreSQL / Redis
     ↓
audit event          → security-relevant operations logged
     ↓
errorHandler         → catches everything, consistent JSON errors
```

## Quick start

```bash
# 1. Start infrastructure
docker compose up -d postgres redis

# 2. Set up backend
cd backend
cp .env.example .env
# Generate real secrets: openssl rand -hex 64
# Paste into JWT_ACCESS_SECRET and JWT_REFRESH_SECRET

npm install
npm run db:generate
npm run db:migrate
npm run db:seed      # Seeds permission catalog + Acme Corp demo users
npm run dev          # API at http://localhost:4000, docs at /docs

# 3. Set up frontend (separate terminal)
cd ../frontend
cp .env.local.example .env.local
pnpm install
pnpm run dev         # UI at http://localhost:3000
```

Or run everything in containers: `docker compose up --build`

## Demo credentials (after `npm run db:seed`)

| User  | Email             | Password         | Role at Acme Corp    |
|-------|-------------------|------------------|----------------------|
| Alice | alice@acme.com    | DemoPassword123! | OWNER                |
| Bob   | bob@acme.com      | DemoPassword123! | MANAGER              |
| Carol | carol@acme.com    | DemoPassword123! | EMPLOYEE             |
| David | david@acme.com    | DemoPassword123! | HR_ADMINISTRATOR     |

Alice is deliberately an OWNER at Acme Corp and an EMPLOYEE at Startup Inc, demonstrating per-organization role resolution.

## Testing

```bash
cd backend
npm test                 # All 67+ tests
npm run test:unit        # Crypto, JWT, token unit tests
npm run test:integration # Full HTTP flows
npm run test:security    # Cross-tenant, RBAC bypass, brute-force, CSRF, etc.
```

Tests run against real Postgres + Redis, not mocks.

## Project structure

```
├── backend/
│   ├── src/
│   │   ├── modules/       Feature modules (auth, users, sessions, orgs, members, roles, permissions, audit)
│   │   ├── infrastructure Database, Redis, email, crypto adapters
│   │   ├── middleware      Auth, authz, rate-limit, CSRF, timeout, error handler
│   │   ├── config         Zod-validated environment config
│   │   └── shared         Errors, types, permission catalog
│   ├── db/
│   │   ├── schema/        Drizzle ORM schema definitions
│   │   ├── migrations/    Generated migrations
│   │   └── seed.ts        Demo data seeder
│   ├── tests/
│   │   ├── unit/          Crypto, JWT, token tests
│   │   ├── integration/   Full HTTP flow tests
│   │   └── security/      Attack-scenario tests
│   └── docs/              Architecture, security, threat model, API reference
├── frontend/
│   ├── app/               Next.js pages (login, dashboard, members, projects, sessions, audit-logs)
│   ├── components         Error banners, nav, auth guard
│   └── lib/               API client, auth context
└── docker-compose.yml     Full-stack local development
```

## Documentation

- [`backend/docs/architecture.md`](backend/docs/architecture.md) — Module layout, request pipeline, data model
- [`backend/docs/security.md`](backend/docs/security.md) — Every security control and why
- [`backend/docs/threat-model.md`](backend/docs/threat-model.md) — Threats considered and mitigations
- [`backend/docs/api.md`](backend/docs/api.md) — Endpoint reference
- [`backend/docs/openapi.yaml`](backend/docs/openapi.yaml) — Machine-readable spec (served at `/docs`)
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — Development setup and contribution guide

## License

ISC
