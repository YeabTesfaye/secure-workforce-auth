"use client";

import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { SkeletonGrid, SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api, type Project, type AuditLogEntry } from "@/lib/api";

function DashboardContent() {
  const { user, currentOrg } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsError, setProjectsError] = useState<unknown>(null);
  const [recentEvents, setRecentEvents] = useState<AuditLogEntry[] | null>(null);
  const [eventsError, setEventsError] = useState<unknown>(null);

  const load = useCallback(() => {
    if (!currentOrg) return;

    let isMounted = true;

    // Fetch projects
    api<{ data: Project[] }>(`/organizations/${currentOrg.id}/projects`)
      .then((res) => {
        if (isMounted) {
          setProjects(res.data);
          setProjectsError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setProjectsError(err);
          setProjects(null);
        }
      });

    // Recent activity requires audit_logs:read -- not every role has it
    // (e.g. EMPLOYEE doesn't), so this genuinely 403s for some users. That's
    // expected and handled below, not worked around.
    api<{ data: AuditLogEntry[] }>(`/organizations/${currentOrg.id}/audit-logs?limit=5`)
      .then((res) => {
        if (isMounted) {
          setRecentEvents(res.data);
          setEventsError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setEventsError(err);
          setRecentEvents(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentOrg?.id]);

  useEffect(() => {
    const cleanup = load();
    return () => {
      if (cleanup) cleanup();
    };
  }, [load]);

  // Reset state when org changes
  useEffect(() => {
    setProjects(null);
    setProjectsError(null);
    setRecentEvents(null);
    setEventsError(null);
  }, [currentOrg?.id]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          {user?.fullName ?? user?.email} — {currentOrg ? `${currentOrg.name} (${currentOrg.roleName})` : "No organization selected"}
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-3">
        <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Current user</p>
          <p className="mt-1 text-sm text-slate-200">{user?.email}</p>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Organization</p>
          <p className="mt-1 text-sm text-slate-200">{currentOrg?.name ?? "—"}</p>
        </div>
        <div className="rounded border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Role</p>
          <p className="mt-1 text-sm text-slate-200">{currentOrg?.roleName ?? "—"}</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-slate-300">Active projects</h2>
        {projectsError ? (
          <ApiErrorBanner error={projectsError} />
        ) : !projects ? (
          <SkeletonGrid cols={3} />
        ) : projects.length === 0 ? (
          <p className="text-sm text-slate-500">No projects yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded border border-slate-800">
            {projects.map((p) => (
              <li key={p.id} className="px-4 py-2 text-sm text-slate-300">
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-slate-300">Recent activity</h2>
        {eventsError ? (
          <ApiErrorBanner error={eventsError} />
        ) : !recentEvents ? (
          <SkeletonList rows={3} />
        ) : recentEvents.length === 0 ? (
          <p className="text-sm text-slate-500">No recent events.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded border border-slate-800">
            {recentEvents.map((e) => (
              <li key={e.id} className="flex flex-col sm:flex-row sm:justify-between px-4 py-2 text-sm gap-1">
                <span className="font-mono text-slate-300">{e.event}</span>
                <span className="text-slate-500 text-xs sm:text-sm">{new Date(e.createdAt).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}
