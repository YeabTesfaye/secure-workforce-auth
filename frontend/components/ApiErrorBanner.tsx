"use client";

import { ApiError } from "@/lib/api";
import { AlertTriangle, ShieldX } from "lucide-react";

export function ApiErrorBanner({ error }: { error: unknown }) {
  if (!(error instanceof ApiError)) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400 animate-fade-in">
        <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <p>Something went wrong talking to the API.</p>
      </div>
    );
  }

  if (error.status === 403) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4 text-sm text-amber-700 dark:text-amber-300 animate-fade-in">
        <ShieldX className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-semibold">403 Forbidden</p>
          <p className="mt-1 text-amber-600 dark:text-amber-400/80">
            The API rejected this request. Your current role in this organization doesn&apos;t grant the permission required for this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400 animate-fade-in">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div>
        <p className="font-semibold">{error.status} — {error.message}</p>
      </div>
    </div>
  );
}
