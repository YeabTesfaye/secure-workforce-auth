import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Every config value that affects security behavior is validated at boot.
// Failing fast here beats discovering a missing secret in production logs.
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(0).default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2592000),

  COOKIE_DOMAIN: z.string().default("localhost"),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  EMAIL_VERIFICATION_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  PASSWORD_RESET_TTL_SECONDS: z.coerce.number().int().positive().default(3600),

  LOGIN_FAILURE_THRESHOLD: z.coerce.number().int().positive().default(5),
  LOGIN_LOCKOUT_SECONDS: z.coerce.number().int().positive().default(900),

  RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_LOGIN_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_REGISTER_WINDOW_SECONDS: z.coerce.number().int().positive().default(3600),
  RATE_LIMIT_GLOBAL_MAX: z.coerce.number().int().positive().default(300),
  RATE_LIMIT_GLOBAL_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),

  EMAIL_PROVIDER: z.enum(["console", "smtp"]).default("console"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("security@secureworkforce.dev"),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
