# Security

This document explains every security-relevant control in the codebase and why it works the way it does. File references point at the implementation.

## Password security

- **Argon2id** (`src/infrastructure/crypto/password.ts`) with OWASP-recommended parameters (19 MiB memory, 3 iterations, 4 lanes). Argon2id is chosen over bcrypt/scrypt because it resists both GPU-cracking (memory-hard) and side-channel attacks (hybrid mode), which is the current OWASP recommendation.
- **Common-password deny-list** checked at registration, password change, and password reset. This catches the passwords that pass complexity rules (`Password1!`) but are still in every cracking dictionary.
- **Complexity rules** (12+ chars, upper/lower/digit/symbol) are a blunt instrument on their own, which is why they're paired with the deny-list rather than relied on alone.

## Login and account protection

- **Redis-backed failure counter per email** (`account-protection.service.ts`), not per-IP alone -- this stops distributed credential-stuffing (many IPs, one target account) as well as single-source brute force.
- **Generic error message** for every login failure path -- unknown email, wrong password, disabled account -- all return the same `"Invalid email or password"` with the same status code. Only account *lockout* is distinguishable (423), which is acceptable because triggering it already proves the attacker caused 5 failures against a real account.
- **Constant-effort password check for unknown emails**: `login()` always runs `argon2.verify` against either the real hash or a fixed dummy hash, so response timing doesn't leak whether an email is registered.

## Session and token architecture

- **Access tokens are short-lived, stateless JWTs** carrying only `sub`, `sessionId`, and `tokenVersion` -- never roles or permissions. Permissions are resolved fresh from Postgres on every organization-scoped request (`loadOrgContext`), so a role change or membership removal takes effect on the very next request, not after the access token happens to expire.
- **`tokenVersion` pinning**: bumped to a new random UUID on password change and password reset. Every access token issued before that moment fails the tokenVersion check on its next use, even if it hasn't expired -- this is how "invalidate all sessions after a password change" is implemented without a token blocklist.
- **Refresh tokens are opaque, high-entropy (256-bit) values**, hashed with SHA-256 before storage. The raw value only ever exists in the client's cookie and in transit; a database compromise alone cannot forge a refresh token.

## Refresh token rotation and reuse detection

See `src/modules/auth/refresh-token.service.ts`.

Every refresh consumes the presented token (marks it `used`) and issues a new one in the same `family_id`. If a token that is already `used` or belongs to a `revoked` family is presented again, that is treated as conclusive evidence of theft: **the entire family and its session are revoked immediately**, not just the one token. This forces both the attacker and the legitimate user to re-authenticate, which is the standard mitigation recommended for public clients that can't hold a refresh token as securely as a confidential client could (OAuth 2.0 Security BCP, RFC 9700).

This is tested end-to-end in `tests/security/refresh-token-reuse.test.ts`, including the case where the *legitimate* user's next rotated token is also rejected after a reuse event -- proving containment isn't partial.

## CSRF

Full threat-model writeup is inline in `src/middleware/csrf.ts` as a doc comment (kept next to the code so it can't drift from the implementation). Summary:

- **Which endpoints**: any state-changing (POST/PATCH/PUT/DELETE) route that authenticates via cookie. Bearer-token requests are exempt (see below).
- **Why**: `access_token`/`refresh_token` are HttpOnly cookies the browser attaches automatically, including on cross-site requests (mitigated further by SameSite=Lax, but that alone is defense-in-depth, not the primary control here).
- **Cookie configuration**: `csrf_token` is **not** HttpOnly (JS must be able to read and echo it), `SameSite=Lax`, scoped to the app's own origin.
- **How the attack is prevented**: double-submit pattern. A cross-site attacker's page can make the browser *send* the csrf_token cookie, but same-origin policy prevents that attacker page from *reading* the cookie's value to also set the matching `X-CSRF-Token` header. Without a matching header, the request is rejected.
- **Bearer clients are exempt** because CSRF is a "confused browser" problem -- a client that deliberately sets an Authorization header isn't relying on ambient cookie auth, so there's nothing for a third-party page to forge.

## Cookies

`src/modules/auth/auth.cookies.ts`. `access_token` and `refresh_token` are `HttpOnly` (immune to XSS-based token theft via `document.cookie`), `Secure` in production, `SameSite=Lax`. The refresh cookie is additionally scoped to `path=/auth/refresh` so it isn't attached to every ordinary API request -- only the one endpoint that needs it.

## Multi-tenant isolation

`src/middleware/authorization.ts` (`loadOrgContext`). Every organization-scoped route resolves `:organizationId` from the route and explicitly checks the caller's `organization_members` row for that org+user pair -- **membership is never inferred from anything else**, including the org existing or the user being authenticated. A user who knows another org's UUID gets an identical 403 whether or not that org exists, so the response itself never confirms an org ID is valid. Every denial is recorded as `CROSS_TENANT_ACCESS_DENIED`.

## RBAC and resource-level authorization

Two layers, applied in order (cheap check first):

1. **RBAC** (`requirePermission`): does the caller's *role in this org* grant the permission at all (e.g. `projects:update`)? This is a role-level yes/no.
2. **Resource-level** (`requireProjectAccess`): for the specific resource being modified, is *this caller* actually authorized -- org OWNER, or the project's assigned manager? A MANAGER role granting `projects:update` in general does not mean every manager can edit every project.

This directly implements the scenario in the project brief: Bob having `projects:read`/`projects:update` on his MANAGER role is necessary but not sufficient to edit a project he isn't assigned to.

## Audit logging

`src/modules/audit/audit.service.ts`. Every security-relevant action across the system writes to one append-only `audit_logs` table (never updated, only inserted), covering the full event catalog in the brief (`USER_REGISTERED` through `PERMISSION_CHANGED`). Logging failures are caught and logged to stderr rather than allowed to fail the primary operation -- a login should not 500 because an audit insert failed, but that failure must still be visible operationally.

## Rate limiting

`src/middleware/rate-limit.ts`, Redis `INCR`+`EXPIRE` fixed-window counters. Applied at multiple levels: global (all routes), per-IP on login, per-email on login (defends against distributed credential stuffing that per-IP limiting alone would miss), and per-IP on registration and forgot-password.

## Attack → Defense → Test

Every entry below corresponds to a real, passing test in `tests/security/` or `tests/integration/` -- not an aspirational claim. Run `npm run test:security` to execute all of them.

```text
Cross-Tenant Access
→ Tenant membership check (loadOrgContext) + resource-level authorization
→ tests/security/cross-tenant.test.ts, tests/integration/multi-tenant-rbac.test.ts

Privilege Escalation
→ Two-layer RBAC (requirePermission) + resource-level checks, fresh
  permission resolution on every request, system roles immutable
→ tests/security/authorization-bypass.test.ts

Refresh Token Theft / Reuse
→ Single-use rotation + family-wide reuse detection revokes the whole
  session, not just the stolen token
→ tests/security/refresh-token-reuse.test.ts

Session Hijacking / Stale Session Reuse
→ HttpOnly/Secure/SameSite cookies, per-session revocation, tokenVersion
  pinning invalidates all tokens minted before a password change
→ tests/security/session-revocation.test.ts, tests/security/authorization-bypass.test.ts

Brute Force / Credential Stuffing
→ Redis rate limiting (per-IP AND per-email) + account lockout after
  repeated failures
→ tests/security/brute-force.test.ts

CSRF
→ Double-submit cookie token required on every cookie-authenticated
  mutation; Bearer clients exempt since they aren't cookie-authenticated
→ tests/security/csrf.test.ts

Password Reset Token Abuse
→ Single-use, short-lived, hashed tokens; generic response regardless of
  whether the email exists; resets invalidate all existing sessions
→ tests/security/password-reset.test.ts

Authentication Bypass (forged/stale/tampered tokens)
→ JWT signature verification, tokenVersion pinning, session-existence
  check, disabled-account check -- all independent of token expiry
→ tests/security/authorization-bypass.test.ts

Account Enumeration
→ Identical generic error for every login failure mode; identical
  forgot-password response regardless of account existence; identical
  403 for a real-but-inaccessible org vs a nonexistent one
→ tests/integration/auth-flow.test.ts, tests/security/password-reset.test.ts,
  tests/security/cross-tenant.test.ts
```

## Security test matrix

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

Generated from an actual run of `npm test` (67/67 passing at time of writing) against real PostgreSQL and Redis -- not mocked. If a property above isn't backed by a test in `tests/`, it doesn't belong in this table; update it alongside any future change to `tests/security/`.

