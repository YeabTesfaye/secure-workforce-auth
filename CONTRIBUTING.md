# Contributing to SecureWorkforce Auth Platform

## Development setup

### Prerequisites

- Node.js 22+
- pnpm 11+ (frontend)
- Docker and Docker Compose
- PostgreSQL and Redis (or use Docker)

### Getting started

```bash
# Clone the repo
git clone https://github.com/YeabTesfaye/secure-workforce-auth.git
cd secure-workforce-auth

# Start infrastructure
docker compose up -d postgres redis

# Backend setup
cd backend
cp .env.example .env
# Edit .env: generate JWT secrets with `openssl rand -hex 64`
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev

# Frontend setup (separate terminal)
cd frontend
cp .env.local.example .env.local
pnpm install
pnpm run dev
```

### Running tests

```bash
cd backend
npm test                 # All tests (requires running Postgres + Redis)
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:security    # Security tests
npm run test:coverage    # With coverage report
```

**Important:** Tests run against real PostgreSQL and Redis instances, not mocks. This is intentional — the properties being tested (tenant isolation, token rotation, lockout) are exactly the properties that mocking would hide bugs in. Make sure Postgres and Redis are running before executing tests.

### Type checking

```bash
# Backend
cd backend
npm run typecheck

# Frontend
cd frontend
pnpm exec tsc --noEmit
```

## Code conventions

### Backend

- **TypeScript strict mode** is enabled — no `any` types, no implicit `undefined`
- **Module structure:** Each feature module has its own directory with:
  - `*.routes.ts` — Express router (thin, just wires middleware + controller)
  - `*.controller.ts` — Parses input with Zod, calls service, shapes response
  - `*.service.ts` — Business logic and database access
  - `*.schemas.ts` — Zod validation schemas
- **Errors:** Use the typed error hierarchy in `src/shared/errors/app-error.ts` (e.g., `ValidationError`, `UnauthorizedError`, `ForbiddenError`). Never throw raw `Error` objects.
- **Async handlers:** Wrap all async route handlers with `asyncHandler()` from `src/shared/utils/async-handler.ts`
- **Audit logging:** Security-relevant operations must call `recordSecurityEvent()` before returning
- **Middleware order matters:** The pipeline in `app.ts` is carefully ordered — request ID first, then security headers, then parsers, then rate limiting, then routes, then error handler last

### Frontend

- **No client-side permission logic:** Pages call the API and render the actual response, including real 403s. Never hide UI elements based on a client-side guess about permissions.
- **All API calls go through `lib/api.ts`:** This is the single HTTP client. It forwards requests with `credentials: "include"` and echoes the CSRF token.
- **Error handling:** Use `ApiErrorBanner` to render API errors. Don't swallow 403s — they're expected behavior for some roles.
- **React patterns:** Use `useCallback` for functions in `useEffect` dependencies. Always check `isMounted` before setting state after async operations.

### Database

- **Schema changes:** Generate migrations with `npm run db:generate`, then apply with `npm run db:migrate`
- **Seed data:** The permission catalog and system roles are defined in `src/shared/utils/permissions-catalog.ts` — this is the single source of truth
- **Refresh tokens** are stored as SHA-256 hashes, never raw
- **No soft deletes** currently — hard deletes are used for simplicity

## Security guidelines

- Never log passwords, tokens, or other secrets
- Never return internal error details in production
- Always validate input with Zod before processing
- Always scope database queries by `organizationId` for multi-tenant routes
- Never trust route parameters alone — verify membership/ownership in the database
- CSRF protection must be applied to all state-changing cookie-authenticated endpoints
- Rate limiting must be applied to authentication endpoints

## Pull request checklist

- [ ] `npm run typecheck` passes (backend)
- [ ] `pnpm exec tsc --noEmit` passes (frontend)
- [ ] `npm test` passes (all tests)
- [ ] New endpoints have corresponding tests
- [ ] Security-relevant changes include audit event logging
- [ ] API changes are reflected in `docs/openapi.yaml`
- [ ] No secrets or credentials in code or diffs
