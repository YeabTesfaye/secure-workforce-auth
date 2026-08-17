# SecureWorkforce Demo Client

A minimal Next.js app that consumes the SecureWorkforce Auth Platform API. It exists to demonstrate the backend's authorization behavior visually, not as a product in its own right.

## What this is (and isn't)

- **Is**: a thin API consumer. Every screen calls the real backend and renders whatever it returns, including real 403s.
- **Isn't**: a place where authentication or authorization logic lives. There is no client-side permission check anywhere in this codebase that decides whether an action is allowed -- `lib/api.ts` forwards requests and responses verbatim, and pages render the backend's actual response (see `components/ApiErrorBanner.tsx`).

If you disabled JavaScript and used `curl` instead, every security property would still hold exactly the same way, because the backend enforces all of it independently of this UI.

## Setup

```bash
cp .env.local.example .env.local   # point NEXT_PUBLIC_API_URL at your running backend
npm install
npm run dev
```

Open `http://localhost:3000`. The backend must already be running (see the root `secure-workforce-auth/README.md`) with `CORS_ORIGIN=http://localhost:3000` in its `.env` so the browser is allowed to send credentialed requests to it.

## Screens

| Screen | Demonstrates |
|---|---|
| **Login** | Cookie-based session creation against `/auth/login`. Click a seeded demo email to prefill it. |
| **Dashboard** | Current user/org/role, active projects, and recent audit activity -- the last of which genuinely 403s for roles without `audit_logs:read` (e.g. EMPLOYEE), shown as an inline banner rather than being hidden. |
| **Members** | Org member list, gated by `members:read`. |
| **Projects** | **Resource-level authorization demo.** Log in as `bob@acme.com` (MANAGER) and try editing **"Q4 Planning"** -- the API returns a real 403 even though his role grants `projects:update` in general, because he isn't *that specific project's* assigned manager (it has none). "Website Redesign" and "Payroll Migration" work fine for him, since he's assigned to those. |
| **Sessions** | Lists real session/device metadata, lets you revoke any session (including the current one, which logs you out) or all others at once. |
| **Audit Logs** | Security event stream, gated by `audit_logs:read`. |

## Why the UI never hides things based on role

The project's authorization model is deliberately backend-authoritative (see `secure-workforce-auth/docs/security.md`). Hardcoding "EMPLOYEE can't see audit logs" as a UI-side `if` statement would create two sources of truth that could drift -- instead, every page just calls the endpoint and handles the real response. A 403 banner is not a bug; on some accounts it's the expected, correct outcome, and it's the same signal a raw `curl` call would give you.
