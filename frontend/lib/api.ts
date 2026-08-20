const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Reads the csrf_token cookie (deliberately not HttpOnly -- see the
// backend's docs/security.md for why) so it can be echoed back in the
// X-CSRF-Token header on mutating requests, per the double-submit pattern
// the API requires. This is the ONLY thing this client does with cookies
// directly; the actual session cookies (access_token/refresh_token) are
// HttpOnly and are sent automatically by the browser via credentials:"include" --
// this code never reads or stores them.
function readCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match?.[1];
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
}

/**
 * Every API call goes through this one function. It does not know or care
 * about roles, permissions, or organizations -- it forwards the request and
 * the response's status code / body verbatim. The backend is authoritative:
 * a 403 here is always a REAL 403 from the API, never a client-side
 * simulation of one. This is deliberate -- see the "must not hardcode
 * permissions" requirement in the project brief.
 */
export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (method !== "GET") {
    const csrf = readCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    credentials: "include", // sends the HttpOnly access_token/refresh_token cookies
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : undefined;

  if (!res.ok) {
    const message = data?.error?.message ?? res.statusText;
    const code = data?.error?.code;
    throw new ApiError(message, res.status, code);
  }

  return data as T;
}

// --- Typed response shapes for the handful of fields the UI reads. ---
// These mirror the API's actual responses; they are NOT a parallel schema
// the frontend enforces -- if the API changes shape, these just describe
// what's expected, they don't gate anything.

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  roleId: string;
  roleName: string;
}

export interface Member {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string | null;
  roleId: string;
  roleName: string;
  createdAt: string;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  managerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  deviceLabel: string;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface AuditLogEntry {
  id: string;
  event: string;
  userId: string | null;
  organizationId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  isSystem: boolean;
  organizationId: string;
}
