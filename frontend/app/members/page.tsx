"use client";

import { useEffect, useState, useCallback, startTransition } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { ApiErrorBanner } from "@/components/ApiErrorBanner";
import { SkeletonTable, EmptyState, PageHeader, RoleBadge, Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError, type Member, type Role } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { Users, Search, Plus, X, Trash2, Shield } from "lucide-react";

function MembersContent() {
  const { currentOrg } = useAuth();
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState("");

  // Add member state
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Change role state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [roleError, setRoleError] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  // Remove member state
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!currentOrg) return;
    let isMounted = true;

    // Resets happen here, inline with the fetch that triggered them.
    // startTransition defers these so they are not treated as a
    // synchronous setState batch inside the effect body.
    startTransition(() => {
      setMembers(null);
      setError(null);
      setSearch("");
      setShowAdd(false);
      setEditingMemberId(null);
    });

    Promise.all([
      api<{ data: Member[] }>(`/organizations/${currentOrg.id}/members`),
      api<{ data: Role[] }>(`/organizations/${currentOrg.id}/roles`).catch(() => ({ data: [] })),
    ]).then(([membersRes, rolesRes]) => {
      if (isMounted) {
        setMembers(membersRes.data);
        setRoles(rolesRes.data);
        setError(null);
      }
    }).catch((err) => {
      if (isMounted) { setError(err); setMembers(null); }
    });

    return () => { isMounted = false; };
  }, [currentOrg]);

  useEffect(() => {
    const cleanup = load();
    return () => { if (cleanup) cleanup(); };
  }, [load]);

  async function addMember() {
    if (!currentOrg || !newEmail.trim() || !newRoleId) return;

    // Client-side email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setAdding(true);
    setAddError(null);
    setEmailError(null);
    try {
      await api(`/organizations/${currentOrg.id}/members`, {
        method: "POST",
        body: { email: newEmail.trim(), roleId: newRoleId },
      });
      setNewEmail("");
      setNewRoleId("");
      setShowAdd(false);
      toast("success", "Member added successfully.");
      load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to add member.";
      setAddError(message);
      toast("error", message);
    } finally {
      setAdding(false);
    }
  }

  async function changeRole(userId: string) {
    if (!currentOrg || !editRoleId) return;
    setChangingRole(true);
    setRoleError(null);
    try {
      await api(`/organizations/${currentOrg.id}/members/${userId}`, {
        method: "PATCH",
        body: { roleId: editRoleId },
      });
      setEditingMemberId(null);
      toast("success", "Role updated successfully.");
      load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to change role.";
      setRoleError(message);
      toast("error", message);
    } finally {
      setChangingRole(false);
    }
  }

  async function removeMember(userId: string) {
    if (!currentOrg) return;
    setRemovingId(userId);
    try {
      await api(`/organizations/${currentOrg.id}/members/${userId}`, {
        method: "DELETE",
      });
      toast("success", "Member removed from the organization.");
      load();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to remove member.";
      setRoleError(message);
      toast("error", message);
    } finally {
      setRemovingId(null);
    }
  }

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
        action={
          <Button size="sm" onClick={() => setShowAdd(!showAdd)}>
            <Plus className="h-3.5 w-3.5" />
            Add member
          </Button>
        }
      />

      {/* Add member form */}
      {showAdd && (
        <div className="rounded-xl border border-[var(--brand-500)]/30 bg-[var(--surface-card)] p-4 animate-fade-in ">
          <p className="text-sm font-medium text-[var(--text-primary)] mb-3">Add a new member</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                value={newEmail}
                onChange={(e) => { setNewEmail(e.target.value); setEmailError(null); }}
                placeholder="Email address"
                type="email"
                className={`w-full rounded-lg border bg-[var(--surface-input)] px-3.5 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] ${
                  emailError ? "border-red-500 dark:border-red-400" : "border-[var(--border-default)]"
                }`}
                autoFocus
              />
              {emailError && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{emailError}</p>}
            </div>
            <select
              value={newRoleId}
              onChange={(e) => setNewRoleId(e.target.value)}
              className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
            >
              <option value="">Select role...</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void addMember()} loading={adding} disabled={!newEmail.trim() || !newRoleId}>
                Add
              </Button>
              <Button size="sm" variant="secondary" onClick={() => { setShowAdd(false); setNewEmail(""); setNewRoleId(""); setAddError(null); }}>
                Cancel
              </Button>
            </div>
          </div>
          {(addError || emailError) && (
            <p className="mt-2 text-xs text-red-500 dark:text-red-400">{addError || emailError}</p>
          )}
        </div>
      )}

      {error ? (
        <ApiErrorBanner error={error} />
      ) : !members ? (
        <SkeletonTable rows={5} cols={4} />
      ) : members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members yet"
          description="Invite team members to collaborate in this organization."
          action={
            <Button size="sm" onClick={() => setShowAdd(true)}>
              <Plus className="h-3.5 w-3.5" />
              Add member
            </Button>
          }
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
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {(filtered ?? members).map((m) => {
                    const isEditing = editingMemberId === m.membershipId;
                    return (
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
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={editRoleId}
                                onChange={(e) => setEditRoleId(e.target.value)}
                                className="rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)]"
                              >
                                {roles.map((r) => (
                                  <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                              </select>
                              <button onClick={() => void changeRole(m.userId)} className="text-emerald-500 hover:text-emerald-400 text-xs font-medium" disabled={changingRole}>
                                {changingRole ? "..." : "Save"}
                              </button>
                              <button onClick={() => { setEditingMemberId(null); setRoleError(null); }} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs">
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <RoleBadge role={m.roleName} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-muted)] text-xs hidden sm:table-cell">
                          {new Date(m.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => { setEditingMemberId(m.membershipId); setEditRoleId(m.roleId); setRoleError(null); }}
                              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-input)] hover:text-[var(--text-primary)] transition-colors"
                              title="Change role"
                            >
                              <Shield className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => { if (confirm(`Remove ${m.email} from this organization?`)) void removeMember(m.userId); }}
                              disabled={removingId === m.userId}
                              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors disabled:opacity-50"
                              title="Remove member"
                            >
                              {removingId === m.userId ? (
                                <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered && filtered.length === 0 && search && (
              <div className="px-4 py-8 text-center text-sm text-[var(--text-muted)]">
                No members match &quot;{search}&quot;
              </div>
            )}
          </div>

          {roleError && (
            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400 animate-fade-in">
              {roleError}
            </div>
          )}

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
