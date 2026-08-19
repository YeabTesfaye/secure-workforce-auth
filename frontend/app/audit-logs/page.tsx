"use client";

import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { SkeletonTable } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api, type AuditLogEntry } from "@/lib/api";

function AuditLogsContent() {
  const { currentOrg } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [eventFilter, setEventFilter] = useState("");

  const load = useCallback(() => {
    if (!currentOrg) return;

    let isMounted = true;
    const query = eventFilter ? `?event=${encodeURIComponent(eventFilter)}` : "";

    api<{ data: AuditLogEntry[] }>(`/organizations/${currentOrg.id}/audit-logs${query}`)
      .then((res) => {
        if (isMounted) {
          setLogs(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setLogs(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentOrg?.id, eventFilter]);

  useEffect(() => {
    const cleanup = load();
    return () => {
      if (cleanup) cleanup();
    };
  }, [load]);

  // Reset state when org changes
  useEffect(() => {
    setLogs(null);
    setError(null);
  }, [currentOrg?.id]);


  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Audit Logs</h1>
          <p className="mt-1 text-sm text-slate-500">
            {currentOrg?.name ?? "No organization selected"} — requires <code>audit_logs:read</code>
          </p>
        </div>
        <input
          placeholder="Filter by event"
          value={eventFilter}
          onChange={(e) => setEventFilter(e.target.value)}
          className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200 placeholder:text-slate-500 w-full sm:w-auto"
        />
      </div>

      {error ? (
        <ApiErrorBanner error={error} />
      ) : !logs ? (
        <SkeletonTable rows={5} cols={3} />
      ) : logs.length === 0 ? (
        <p className="text-sm text-slate-500">No matching events.</p>
      ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2">Event</th>
              <th className="py-2">IP</th>
              <th className="py-2">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {logs.map((log) => (
              <tr key={log.id} className="text-slate-300">
                <td className="py-2 font-mono text-xs">{log.event}</td>
                <td className="py-2 text-slate-500">{log.ipAddress ?? "—"}</td>
                <td className="py-2 text-slate-500">{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
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
