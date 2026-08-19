// Loaded before every test file via vitest.config.ts setupFiles.
// Sets up environment variables needed for the test environment.

process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.DATABASE_URL ??= "postgres://postgres:postgres@localhost:5432/secure_workforce_test";
process.env.REDIS_URL ??= "redis://localhost:6379";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-at-least-32-characters-long-value";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-at-least-32-characters-long-val";
process.env.COOKIE_SECURE ??= "false";
process.env.LOGIN_FAILURE_THRESHOLD ??= "5";
process.env.LOGIN_LOCKOUT_SECONDS ??= "900";
process.env.RATE_LIMIT_LOGIN_MAX ??= "1000";
process.env.RATE_LIMIT_GLOBAL_MAX ??= "10000";
