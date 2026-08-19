"use client";

import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { SkeletonList } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type Project } from "@/lib/api";

function ProjectsContent() {
  const { currentOrg, user } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [rowError, setRowError] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    if (!currentOrg) return;

    let isMounted = true;

    api<{ data: Project[] }>(`/organizations/${currentOrg.id}/projects`)
      .then((res) => {
        if (isMounted) {
          setProjects(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setProjects(null);
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
    setError(null);
    setEditingId(null);
    setRowError({});
  }, [currentOrg?.id]);

  async function saveEdit(projectId: string) {
    if (!currentOrg) return;
    setRowError((prev) => ({ ...prev, [projectId]: "" }));
    try {
      await api(`/organizations/${currentOrg.id}/projects/${projectId}`, {
        method: "PATCH",
        body: { name: editName },
      });
      setEditingId(null);
      load();
    } catch (err) {
      // This is the resource-level authorization demo: RBAC alone
      // (projects:update) is not sufficient here -- the API additionally
      // checks whether the caller is this project's assigned manager or
      // org OWNER, and rejects with 403 if not, even for a MANAGER role
      // that CAN update projects in general. See docs/security.md.
      const message =
        err instanceof ApiError && err.status === 403
          ? "Forbidden: you are not the assigned manager of this project."
          : "Update failed.";
      setRowError((prev) => ({ ...prev, [projectId]: message }));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Projects</h1>
        <p className="mt-1 text-sm text-slate-500">
          {currentOrg?.name ?? "No organization selected"} — editing requires{" "}
          <code>projects:update</code> AND being the assigned manager or org OWNER
        </p>
      </div>

      {error ? (
        <ApiErrorBanner error={error} />
      ) : !projects ? (
        <SkeletonList rows={4} />
      ) : projects.length === 0 ? (
        <p className="text-sm text-slate-500">No projects yet.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => (
            <li key={p.id} className="rounded border border-slate-800 bg-slate-900/40 p-3">
              {editingId === p.id ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100 w-full sm:w-auto"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => void saveEdit(p.id)}
                      className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-200">{p.name}</p>
                    <p className="text-xs text-slate-500">
                      {p.managerId === user?.id ? "You are the assigned manager" : "Not assigned to you"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(p.id);
                      setEditName(p.name);
                    }}
                    className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  >
                    Edit
                  </button>
                </div>
              )}
              {rowError[p.id] && <p className="mt-2 text-xs text-amber-400">{rowError[p.id]}</p>}
            </li>
          ))}
        </ul>
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
