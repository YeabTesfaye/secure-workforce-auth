import { ApiError } from "@/lib/api";

// Renders the ACTUAL error the API returned. For a 403 this means the
// backend's requirePermission (or resource-level) check really did reject
// the request -- this component doesn't decide anything, it just displays.
export function ApiErrorBanner({ error }: { error: unknown }) {
  if (!(error instanceof ApiError)) {
    return (
      <div className="rounded border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
        Something went wrong talking to the API.
      </div>
    );
  }

  if (error.status === 403) {
    return (
      <div className="rounded border border-amber-800 bg-amber-950/40 p-4 text-sm text-amber-300">
        <strong>403 Forbidden</strong> — the API rejected this request. Your current role in this
        organization doesn&apos;t grant the permission required for this page.
      </div>
    );
  }

  return (
    <div className="rounded border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
      <strong>{error.status}</strong> — {error.message}
    </div>
  );
}
