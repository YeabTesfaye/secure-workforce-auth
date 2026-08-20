"use client";

import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { SkeletonTable, EmptyState, PageHeader, RoleBadge } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api, type Member } from "@/lib/api";
import { Users, Search } from "lucide-react";

function MembersContent() {
  const { currentOrg } = useAuth();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    if (!currentOrg) return;
    let isMounted = true;

    api<{ data: Member[] }>(`/organizations/${currentOrg.id}/members`)
      .then((res) => {
        if (isMounted) { setMembers(res.data); setError(null); }
      })
      .catch((err) => {
        if (isMounted) { setError(err); setMembers(null); }
      });

    return () => { isMounted = false; };
  }, [currentOrg?.id]);

  useEffect(() => {
    const cleanup = load();
    return () => { if (cleanup) cleanup(); };
  }, [load]);

  useEffect(() => { setMembers(null); setError(null); setSearch(""); }, [currentOrg?.id]);

  const filtered = members?.filter(
    (m) =>
      m.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase()) ||
      m.roleName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Users}
        title="Members"
        description={`${currentOrg?.name ?? "No organization selected"} · requires members:read`}
      />

      {error ? (
        <ApiErrorBanner error={error} />
      ) : !members ? (
        <SkeletonTable rows={5} cols={4} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Invite team members to collaborate in this organization."
        />
      ) : (
        <>
          {/* Search */}
          <div className="relative max-w-sm animate-fade-in">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] pl-10 pr-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent hover:border-[var(--border-strong)]"
            />
          </div>

          {/* Table */}
          <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden animate-slide-up stagger-1">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-default)] bg-[var(--surface-card)]">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] hidden sm:table-cell">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {(filtered ?? members).map((m) => (
                    <tr key={m.membershipId} className="transition-colors hover:bg-[var(--surface-card-hover)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-500)]/10 text-xs font-bold text-[var(--brand-600)] dark:text-[var(--brand-400)]">
                            {(m.fullName ?? m.email)?.[0]?.toUpperCase()}
                          </div>
                          <span className="font-medium text-[var(--text-primary)]">{m.fullName ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)]">{m.email}</td>
                      <td className="px-4 py-3"><RoleBadge role={m.roleName} /></td>
                      <td className="px-4 py-3 text-[var(--text-muted)] text-xs hidden sm:table-cell">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered && filtered.length === 0 && search && (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No members match &quot;{search}&quot;
              </div>
            )}
          </div>

          {/* Footer count */}
          <p className="text-xs text-[var(--text-muted)]">
            {filtered?.length ?? members.length} member{(filtered?.length ?? members.length) !== 1 ? "s" : ""}
          </p>
        </>
      )}
    </div>
  );
}

export default function MembersPage() {
  return (
    <RequireAuth>
      <MembersContent />
    </RequireAuth>
  );
}
