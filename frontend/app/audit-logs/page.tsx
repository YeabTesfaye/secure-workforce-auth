"use client";

import { useEffect, useState, useCallback, startTransition } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { SkeletonTable, EmptyState, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api, type AuditLogEntry } from "@/lib/api";
import { ScrollText, Search, Clock, Globe, User as UserIcon } from "lucide-react";

function AuditLogsContent() {
  const { currentOrg } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [eventFilter, setEventFilter] = useState("");

  const load = useCallback(() => {
    if (!currentOrg) return;
    let isMounted = true;

    // Reset state when org changes — wrapped in startTransition
    // to avoid "setState synchronously in effect" ESLint warning.
    startTransition(() => {
      setLogs(null);
      setError(null);
    });

    const query = eventFilter ? `?event=${encodeURIComponent(eventFilter)}` : "";

    api<{ data: AuditLogEntry[] }>(`/organizations/${currentOrg.id}/audit-logs${query}`)
      .then((res) => {
        if (isMounted) { setLogs(res.data); setError(null); }
      })
      .catch((err) => {
        if (isMounted) { setError(err); setLogs(null); }
      });

    return () => { isMounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when org ID or filter changes
  }, [currentOrg?.id, eventFilter]);

  useEffect(() => {
    const cleanup = load();
    return () => { if (cleanup) cleanup(); };
  }, [load]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ScrollText}
        title="Audit Logs"
        description={`${currentOrg?.name ?? "No organization selected"} · requires audit_logs:read`}
      />

      {/* Filter */}
      <div className="relative max-w-sm animate-fade-in">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
          placeholder="Filter by event type..."
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] pl-10 pr-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent hover:border-[var(--border-strong)]"
        />
      </div>

      {error ? (
        <ApiErrorBanner error={error} />
      ) : !logs ? (
        <SkeletonTable rows={5} cols={3} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={eventFilter ? "No matching events" : "No audit events"}
          description={eventFilter ? `No events match "${eventFilter}"` : "Security events will appear here as they occur."}
        />
      ) : (
        <>
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden animate-slide-up stagger-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--surface-card)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">IP Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {logs.map((log) => (
                    <tr key={log.id} className="transition-colors hover:bg-[var(--surface-card-hover)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center rounded-md bg-[var(--surface-input)] border border-[var(--border-default)] px-2 py-0.5 font-mono text-xs font-medium text-[var(--text-primary)]">
                            {log.event}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                          <Globe className="h-3.5 w-3.5" />
                          {log.ipAddress ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Showing {logs.length} event{logs.length !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <RequireAuth>
      <AuditLogsContent />
    </RequireAuth>
  );
}
