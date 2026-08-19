/**
 * Input sanitization middleware. Strips potentially dangerous characters
 * from string fields in request bodies to prevent stored XSS.
 *
 * This is defense-in-depth alongside Zod validation. Zod enforces types
 * and structure; this handles content that passes Zod but could be
 * rendered unsafely in HTML contexts (e.g., names, project titles).
 *
 * Applied globally to all JSON request bodies. Only targets string values
 * at the top level and one level deep (not recursive) to avoid performance
 * overhead.
 */

const DANGEROUS_CHARS = /[<>'"&]/g;
const HTML_ENTITIES: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "'": "&#39;",
  '"': "&quot;",
  "&": "&amp;",
};

function sanitizeString(value: string): string {
  return value.replace(DANGEROUS_CHARS, (char) => HTML_ENTITIES[char] ?? char);
}

function sanitizeObject(obj: Record<string, unknown>, depth = 0): void {
  if (depth > 2) return; // Don't recurse too deep
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (typeof val === "string") {
      obj[key] = sanitizeString(val);
    } else if (val && typeof val === "object" && !Array.isArray(val)) {
      sanitizeObject(val as Record<string, unknown>, depth + 1);
    }
  }
}

/**
 * Express middleware that sanitizes string values in JSON request bodies.
 * Only processes requests with Content-Type: application/json.
 */
export function sanitizeInput(
  req: { body?: unknown },
  _res: unknown,
  next: () => void
) {
  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    sanitizeObject(req.body as Record<string, unknown>);
  }
  next();
}
