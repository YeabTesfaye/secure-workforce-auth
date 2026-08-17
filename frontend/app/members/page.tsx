"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { useAuth } from "@/lib/auth-context";
import { api, type Member } from "@/lib/api";

function MembersContent() {
  const { currentOrg } = useAuth();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!currentOrg) return;

    // Use a flag to avoid setting state if the component unmounts mid-flight
    let isMounted = true;

    api<{ data: Member[] }>(`/organizations/${currentOrg.id}/members`)
      .then((res) => {
        if (isMounted) {
          setMembers(res.data);
          setError(null); // Safely clear any previous errors here
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setMembers(null); // Clear the members list if the API fails
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentOrg]);

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
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2">Name</th>
              <th className="py-2">Email</th>
              <th className="py-2">Role</th>
              <th className="py-2">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {members.map((m) => (
              <tr key={m.membershipId} className="text-slate-300">
                <td className="py-2">{m.fullName ?? "—"}</td>
                <td className="py-2 text-slate-400">{m.email}</td>
                <td className="py-2">
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs">{m.roleName}</span>
                </td>
                <td className="py-2 text-slate-500">{new Date(m.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
