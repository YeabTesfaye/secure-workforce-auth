import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env, isTest } from "../../config/env.js";
import * as schema from "../../../db/schema/index.js";

// A single pooled connection shared across the app. `max` kept modest since
// this is a single-service deployment; tune upward behind a real pgbouncer.
export const queryClient = postgres(env.DATABASE_URL, {
  max: isTest ? 5 : 20,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(queryClient, { schema });

export type Database = typeof db;

export async function closeDatabase() {
  await queryClient.end({ timeout: 5 });
}
