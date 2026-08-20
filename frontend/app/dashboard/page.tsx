"use client";

import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { SkeletonGrid, SkeletonList, StatCard, EmptyState, SkeletonCard } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api, type Project, type AuditLogEntry } from "@/lib/api";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Activity,
  Clock,
  ArrowRight,
  Briefcase,
} from "lucide-react";
import Link from "next/link";

function DashboardContent() {
  const { user, currentOrg, organizations } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [projectsError, setProjectsError] = useState<unknown>(null);
  const [recentEvents, setRecentEvents] = useState<AuditLogEntry[] | null>(null);
  const [eventsError, setEventsError] = useState<unknown>(null);

  const load = useCallback(() => {
    if (!currentOrg) return;

    let isMounted = true;

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

    return () => { isMounted = false; };
  }, [currentOrg?.id]);

  useEffect(() => {
    const cleanup = load();
    return () => { if (cleanup) cleanup(); };
  }, [load]);

  useEffect(() => {
    setProjects(null);
    setProjectsError(null);
    setRecentEvents(null);
    setEventsError(null);
  }, [currentOrg?.id]);

  return (
    <div className="space-y-8">
      {/* ── Welcome banner ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl border border-[var(--border-default)] bg-gradient-to-br from-[var(--brand-600)]/10 via-transparent to-emerald-500/5 p-6 sm:p-8 animate-fade-in">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome back, {user?.fullName?.split(" ")[0] ?? user?.email?.split("@")[0]}
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {currentOrg ? (
              <>
                You&apos;re viewing <span className="font-medium text-[var(--text-primary)]">{currentOrg.name}</span> as{" "}
                <span className="font-medium text-[var(--text-primary)]">{currentOrg.roleName}</span>
              </>
            ) : (
              "No organization selected"
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/members"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] hover:border-[var(--border-strong)] transition-all duration-200"
            >
              <Users className="h-3.5 w-3.5" />
              View members
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              href="/projects"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--surface-card)] border border-[var(--border-default)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] hover:border-[var(--border-strong)] transition-all duration-200"
            >
              <FolderKanban className="h-3.5 w-3.5" />
              View projects
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stat cards ────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-slide-up stagger-1">
        <StatCard
          icon={Users}
          label="Organization"
          value={currentOrg?.name ?? "—"}
          description={`${currentOrg?.roleName ?? "No role"} · ${organizations.length} org${organizations.length !== 1 ? "s" : ""} total`}
          color="blue"
        />
        <StatCard
          icon={Briefcase}
          label="Projects"
          value={projects === null ? "—" : projects.length}
          description={projects === null ? "Loading..." : projects.length === 0 ? "No projects yet" : "Active projects"}
          color="green"
        />
        <StatCard
          icon={Activity}
          label="Recent Events"
          value={recentEvents === null ? "—" : recentEvents.length}
          description={eventsError ? "Access denied" : recentEvents === null ? "Loading..." : "Last 5 audit events"}
          color={eventsError ? "slate" : "purple"}
        />
      </div>

      {/* ── Two-column layout ─────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Projects */}
        <div className="lg:col-span-3 space-y-4 animate-slide-up stagger-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Active projects</h2>
            <Link href="/projects" className="text-xs font-medium text-[var(--brand-600)] dark:text-[var(--brand-400)] hover:underline">
              View all →
            </Link>
          </div>
          {projectsError ? (
            <ApiErrorBanner error={projectsError} />
          ) : !projects ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create your first project to get started."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-[var(--brand-500)]/20"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[var(--text-primary)] truncate">{p.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">
                        Created {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <FolderKanban className="h-4 w-4 text-[var(--text-muted)] group-hover:text-[var(--brand-500)] transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2 space-y-4 animate-slide-up stagger-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Recent activity</h2>
            <Link href="/audit-logs" className="text-xs font-medium text-[var(--brand-600)] dark:text-[var(--brand-400)] hover:underline">
              View all →
            </Link>
          </div>
          {eventsError ? (
            <ApiErrorBanner error={eventsError} />
          ) : !recentEvents ? (
            <SkeletonList rows={3} />
          ) : recentEvents.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No recent events"
              description="Audit events will appear here."
            />
          ) : (
            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] divide-y divide-[var(--border-default)]">
              {recentEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3 transition-colors hover:bg-[var(--surface-card-hover)]">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium font-mono text-[var(--text-primary)] truncate">{e.event}</p>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Clock className="h-3 w-3" />
                      {new Date(e.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
