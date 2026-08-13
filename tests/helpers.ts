import type { Response as SupertestResponse } from "supertest";
import { db } from "../src/infrastructure/database/client.js";
import { permissions } from "../db/schema/index.js";
import { ALL_PERMISSIONS } from "../src/shared/utils/permissions-catalog.js";

// Seeds the global permission catalog. Called at the top of any test that
// exercises organization creation, since createOrganization looks up
// permission rows by key when granting default system roles.
export async function seedPermissionCatalog() {
  for (const key of ALL_PERMISSIONS) {
    const [resource, action] = key.split(":");
    await db.insert(permissions).values({ key, resource, action });
  }
}

// Parses Set-Cookie headers from a supertest response into a simple map,
// and returns a "Cookie" header string usable on the next request -- tests
// don't use a browser, so we wire the cookie jar manually.
export function extractCookies(res: SupertestResponse): Record<string, string> {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  const cookies: Record<string, string> = {};
  if (!raw) return cookies;
  for (const entry of raw) {
    const [pair] = entry.split(";");
    const [name, value] = pair.split("=");
    cookies[name] = value;
  }
  return cookies;
}

export function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}
