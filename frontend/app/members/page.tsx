"use client";

import { useEffect, useState, useCallback } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { SkeletonTable } from "@/components/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { api, type Member } from "@/lib/api";

function MembersContent() {
  const { currentOrg } = useAuth();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(() => {
    if (!currentOrg) return;

    let isMounted = true;

    api<{ data: Member[] }>(`/organizations/${currentOrg.id}/members`)
      .then((res) => {
        if (isMounted) {
          setMembers(res.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setMembers(null);
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
    setMembers(null);
    setError(null);
  }, [currentOrg?.id]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Members</h1>
        <p className="mt-1 text-sm text-slate-500">
          {currentOrg?.name ?? "No organization selected"} — requires <code>members:read</code>
        </p>
      </div>

      {error ? (
        <ApiErrorBanner error={error} />
      ) : !members ? (
        <SkeletonTable rows={5} cols={4} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2 hidden sm:table-cell">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {members.map((m) => (
                <tr key={m.membershipId} className="text-slate-300">
                  <td className="py-2">{m.fullName ?? "—"}</td>
                  <td className="py-2 text-slate-400 text-xs sm:text-sm">{m.email}</td>
                  <td className="py-2">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-xs">{m.roleName}</span>
                  </td>
                  <td className="py-2 text-slate-500 hidden sm:table-cell">{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
