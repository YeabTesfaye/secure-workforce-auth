# Threat Model

| Threat | Mitigation | Implementation | Test coverage |
|---|---|---|---|
| Credential stuffing | Rate limiting (per-IP and per-email) + account lockout | `middleware/rate-limit.ts`, `auth/account-protection.service.ts` | `tests/security/brute-force.test.ts` |
| Brute-force login | Login attempt tracking, lockout after N failures | `account-protection.service.ts` | `tests/security/brute-force.test.ts` |
| Stolen refresh token | Rotation on every use + reuse detection revokes the whole family | `auth/refresh-token.service.ts` | `tests/security/refresh-token-reuse.test.ts` |
| Session hijacking | HttpOnly/Secure/SameSite cookies + per-session revocation | `auth/auth.cookies.ts`, `sessions/sessions.service.ts` | `tests/integration/auth-flow.test.ts` |
| CSRF | Double-submit cookie pattern on cookie-authenticated mutations | `middleware/csrf.ts` | `tests/security/csrf.test.ts` |
| Password database breach | Argon2id hashing, never reversible | `crypto/password.ts` | `tests/unit/password.test.ts` |
| Privilege escalation | Two-layer permission checks (RBAC + resource-level), permissions re-resolved per request | `middleware/authorization.ts`, `middleware/resource-authorization.ts` | `tests/integration/multi-tenant-rbac.test.ts` |
| Cross-tenant access | Membership verified from route param on every org-scoped request, never inferred | `middleware/authorization.ts` (`loadOrgContext`) | `tests/integration/multi-tenant-rbac.test.ts` |
| Password reset abuse | Short-lived, single-use, hashed tokens; rate limited; generic responses | `auth/auth.service.ts` (`forgotPassword`/`resetPassword`) | manual / integration |
| Unauthorized role changes | RBAC-gated (`members:update`, `roles:manage`) + audit logging + forced re-auth on change | `members/members.service.ts`, `roles/roles.service.ts` | `tests/integration/multi-tenant-rbac.test.ts` |
| Account enumeration | Identical generic error for all login failure modes; identical response for forgot-password whether or not the account exists | `auth/auth.service.ts` | `tests/integration/auth-flow.test.ts` |
| Token replay after logout/password change | `tokenVersion` pinning invalidates all outstanding access tokens instantly | `crypto/jwt.ts`, `middleware/authentication.ts` | manual / integration |
| Malicious or malformed input | Zod validation on every request body/query/param, environment config validated at boot | `*/​*.schemas.ts`, `config/env.ts` | `tests/integration/auth-flow.test.ts` (weak password case) |

## Explicitly out of scope for this build

These are called out rather than silently omitted, per the brief's emphasis on precise threat modeling:

- **Email delivery security** (SPF/DKIM/DMARC, provider-side spam handling) -- the `EmailProvider` abstraction exists so a real provider can be wired in, but `ConsoleEmailProvider` is used in dev/test and `SmtpEmailProvider` is a stub.
- **WAF / DDoS mitigation** -- assumed to sit in front of this service (e.g. Cloudflare, ALB) rather than being reimplemented in application code.
- **Secrets management** -- `.env` is used for local dev; production deployment should source `JWT_*_SECRET` and `DATABASE_URL` from a secrets manager (Vault, AWS Secrets Manager, etc.), not a checked-in file.
- **MFA/2FA** -- not implemented in this iteration; the session/token architecture (particularly `tokenVersion` and the refresh-family model) is designed so an MFA step could be inserted at login without restructuring the token model.

## Demo scenario walkthrough

The full attacker-and-defender walkthrough described in the project brief (Carol logs in → tries to change org settings → 403; Bob updates a project → succeeds; Bob tries billing → 403; Alice demotes Bob → his next project update is denied; brute-force triggers lockout; stolen refresh token triggers family revocation) is executed as an automated test suite rather than a manual demo script -- see `tests/integration/multi-tenant-rbac.test.ts` and `tests/security/`. Running `npm test` reproduces the entire scenario and asserts on every step.
