"use client";

import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { SkeletonList, EmptyState, PageHeader, Button } from "@/components/ui";
import { api, type Session } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import {
  Monitor,
  Globe,
  Clock,
  Trash2,
  ShieldAlert,
  Smartphone,
  Laptop,
} from "lucide-react";

function SessionsContent() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    let isMounted = true;
    api<{ data: Session[] }>("/sessions")
      .then((res) => {
        if (isMounted) { setSessions(res.data); setError(null); }
      })
      .catch((err) => {
        if (isMounted) { setError(err); setSessions(null); }
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const cleanup = load();
    return () => { if (cleanup) cleanup(); };
  }, [load]);

  async function revoke(id: string) {
    setBusyId(id);
    try {
      await api(`/sessions/${id}`, { method: "DELETE" });
      toast("success", "Session revoked.");
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function revokeAllOthers() {
    setBusyId("all");
    try {
      await api("/sessions/all", { method: "DELETE" });
      toast("success", "All other sessions revoked.");
      load();
    } finally {
      setBusyId(null);
    }
  }

  function getDeviceIcon(label: string) {
    const lower = label.toLowerCase();
    if (lower.includes("mobile") || lower.includes("phone") || lower.includes("android") || lower.includes("iphone")) return Smartphone;
    if (lower.includes("desktop") || lower.includes("chrome") || lower.includes("firefox") || lower.includes("safari") || lower.includes("windows") || lower.includes("mac")) return Laptop;
    return Monitor;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Monitor}
        title="Sessions"
        description="Active sessions across all your devices."
        action={
          sessions && sessions.length > 1 ? (
            <Button variant="danger" size="sm" onClick={() => void revokeAllOthers()} loading={busyId === "all"}>
              <ShieldAlert className="h-3.5 w-3.5" />
              Revoke all other sessions
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <ApiErrorBanner error={error} />
      ) : !sessions ? (
        <SkeletonList rows={3} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={Monitor}
          title="No active sessions"
          description="You don't have any active sessions."
        />
      ) : (
        <div className="space-y-3 animate-slide-up stagger-1">
          {sessions.map((s) => {
            const DeviceIcon = getDeviceIcon(s.deviceLabel);
            return (
              <div
                key={s.id}
                className={`group flex items-center justify-between rounded-xl border bg-[var(--surface-card)] p-4 transition-all duration-200 hover:shadow-[var(--shadow-sm)] ${
                  s.isCurrent
                    ? "border-[var(--brand-500)]/30 bg-[var(--brand-500)]/[0.02]"
                    : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`rounded-lg p-2.5 ${s.isCurrent ? "bg-[var(--brand-500)]/10" : "bg-[var(--surface-input)]"}`}>
                    <DeviceIcon className={`h-5 w-5 ${s.isCurrent ? "text-[var(--brand-500)]" : "text-[var(--text-muted)]"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">{s.deviceLabel}</p>
                      {s.isCurrent && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-500)]/10 border border-[var(--brand-500)]/20 px-2 py-0.5 text-[11px] font-medium text-[var(--brand-600)] dark:text-[var(--brand-400)]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-500)] animate-pulse" />
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)]">
                      {s.ipAddress && (
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {s.ipAddress}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(s.lastActiveAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {!s.isCurrent && (
                  <button
                    onClick={() => void revoke(s.id)}
                    disabled={busyId === s.id}
                    className="rounded-lg border border-[var(--border-default)] p-2 text-[var(--text-muted)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 hover:border-red-200 dark:hover:border-red-800 transition-all duration-200 disabled:opacity-50"
                    title="Revoke session"
                  >
                    {busyId === s.id ? (
                      <span className="block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>
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
