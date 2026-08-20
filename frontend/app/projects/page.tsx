"use client";

import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { SkeletonGrid, EmptyState, PageHeader, Button, Input } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type Project } from "@/lib/api";
import { FolderKanban, Pencil, Save, X, CheckCircle2 } from "lucide-react";

function ProjectsContent() {
  const { currentOrg, user } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!currentOrg) return;
    let isMounted = true;

    api<{ data: Project[] }>(`/organizations/${currentOrg.id}/projects`)
      .then((res) => {
        if (isMounted) { setProjects(res.data); setError(null); }
      })
      .catch((err) => {
        if (isMounted) { setError(err); setProjects(null); }
      });

    return () => { isMounted = false; };
  }, [currentOrg?.id]);

  useEffect(() => {
    const cleanup = load();
    return () => { if (cleanup) cleanup(); };
  }, [load]);

  useEffect(() => {
    setProjects(null);
    setError(null);
    setEditingId(null);
    setRowError({});
  }, [currentOrg?.id]);

  async function saveEdit(projectId: string) {
    if (!currentOrg) return;
    setSaving(true);
    setRowError((prev) => ({ ...prev, [projectId]: "" }));
    try {
      await api(`/organizations/${currentOrg.id}/projects/${projectId}`, {
        method: "PATCH",
        body: { name: editName },
      });
      setEditingId(null);
      load();
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 403
          ? "You are not the assigned manager of this project."
          : "Update failed.";
      setRowError((prev) => ({ ...prev, [projectId]: message }));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={FolderKanban}
        title="Projects"
        description={`${currentOrg?.name ?? "No organization selected"} · editing requires projects:update AND being the assigned manager or org OWNER`}
      />

      {error ? (
        <ApiErrorBanner error={error} />
      ) : !projects ? (
        <SkeletonGrid cols={3} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to get started."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-slide-up stagger-1">
          {projects.map((p) => {
            const isEditing = editingId === p.id;
            const isManager = p.managerId === user?.id;
            return (
              <div
                key={p.id}
                className={`group rounded-xl border bg-[var(--surface-card)] p-5 transition-all duration-200 hover:shadow-[var(--shadow-md)] ${
                  isEditing
                    ? "border-[var(--brand-500)]/40 ring-1 ring-[var(--brand-500)]/20"
                    : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                }`}
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => void saveEdit(p.id)} loading={saving}>
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-[var(--text-primary)]">{p.name}</h3>
                        <p className="mt-1 text-xs text-[var(--text-muted)]">
                          Created {new Date(p.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                        className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-input)] hover:text-[var(--text-primary)] transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      {isManager ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          You manage this
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-[var(--surface-input)] border border-[var(--border-default)] px-2.5 py-0.5 text-xs text-[var(--text-muted)]">
                          Not your project
                        </span>
                      )}
                    </div>
                  </>
                )}

                {rowError[p.id] && (
                  <div className="mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-600 dark:text-amber-400 animate-fade-in">
                    {rowError[p.id]}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <RequireAuth>
      <ProjectsContent />
    </RequireAuth>
  );
}
