"use client";

import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { api, type Session } from "@/lib/api";

function SessionsContent() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // 1. Wrapped in useCallback to make the function stable
  const load = useCallback(() => {
    let isMounted = true;

    api<{ data: Session[] }>("/sessions")
      .then((res) => {
        if (isMounted) {
          setSessions(res.data);
          setError(null); // Safely clear old errors here
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setSessions(null); // Clear sessions if the fetch fails
        }
      });

    return () => {
      isMounted = false;
    };
  }, []); // Empty array because it has no external dependencies

  // 2. Safely call the load function when the component mounts
  useEffect(() => {
    const cleanup = load();
    return () => {
      if (cleanup) cleanup();
    };
  }, [load]);

  async function revoke(id: string) {
    setBusyId(id);
    try {
      await api(`/sessions/${id}`, { method: "DELETE" });
      load(); // Safely triggers a refresh
    } finally {
      setBusyId(null);
    }
  }

  async function revokeAllOthers() {
    setBusyId("all");
    try {
      await api("/sessions/all", { method: "DELETE" });
      load(); // Safely triggers a refresh
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Sessions</h1>
          <p className="mt-1 text-sm text-slate-500">Active sessions across all your devices.</p>
        </div>
        <button
          onClick={() => void revokeAllOthers()}
          disabled={busyId === "all"}
          className="rounded border border-red-800 px-3 py-1.5 text-sm text-red-300 hover:bg-red-950/40 disabled:opacity-50"
        >
          Revoke all other sessions
        </button>
      </div>

      {error ? (
        <ApiErrorBanner error={error} />
      ) : !sessions ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/40 p-3"
            >
              <div>
                <p className="text-sm text-slate-200">
                  {s.deviceLabel}
                  {s.isCurrent && (
                    <span className="ml-2 rounded bg-emerald-900/60 px-2 py-0.5 text-xs text-emerald-400">
                      This device
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {s.ipAddress ?? "unknown IP"} · last active {new Date(s.lastActiveAt).toLocaleString()} ·
                  created {new Date(s.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => void revoke(s.id)}
                disabled={busyId === s.id}
                className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SessionsPage() {
  return (
    <RequireAuth>
      <SessionsContent />
    </RequireAuth>
  );
}
