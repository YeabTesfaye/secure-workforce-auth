"use client";

import { useState, useEffect } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { Button, PageHeader } from "@/components/ui";
import {
  User,
  Mail,
  CheckCircle2,
  XCircle,
  Edit3,
  Save,
  X,
  Calendar,
  Shield,
  Clock,
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  emailVerified: boolean;
  isDisabled: boolean;
  createdAt: string;
  updatedAt: string;
}

function ProfileContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    api<{ data: UserProfile }>("/users/me")
      .then((res) => {
        if (isMounted) {
          setProfile(res.data);
          setFullName(res.data.fullName ?? "");
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) setError(err instanceof ApiError ? err.message : "Failed to load profile.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSave() {
    if (!fullName.trim()) {
      setNameError("Name cannot be empty");
      return;
    }
    if (fullName.trim().length > 255) {
      setNameError("Name must be 255 characters or less");
      return;
    }
    setSaving(true);
    setNameError(null);
    try {
      const res = await api<{ data: UserProfile }>("/users/me", {
        method: "PATCH",
        body: { fullName: fullName.trim() },
      });
      setProfile(res.data);
      setEditing(false);
      toast("success", "Profile updated successfully.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to update profile.";
      setNameError(msg);
      toast("error", msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 w-48 animate-pulse rounded-lg bg-[var(--surface-input)]" />
        <div className="h-64 animate-pulse rounded-xl bg-[var(--surface-card)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <PageHeader
        icon={User}
        title="Profile"
        description="View and manage your account details."
      />

      {/* Profile card */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] overflow-hidden">
        {/* Header banner */}
        <div className="h-24 bg-gradient-to-r from-[var(--brand-600)] via-[var(--brand-700)] to-emerald-600" />

        <div className="px-6 pb-6">
          {/* Avatar */}
          <div className="-mt-10 mb-4 flex items-end justify-between">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-4 border-[var(--surface-card)] bg-[var(--brand-500)]/10 text-2xl font-bold text-[var(--brand-600)] dark:text-[var(--brand-400)] shadow-lg">
              {(profile?.fullName ?? profile?.email)?.[0]?.toUpperCase()}
            </div>
            {!editing && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setEditing(true);
                  setFullName(profile?.fullName ?? "");
                  setNameError(null);
                }}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit profile
              </Button>
            )}
          </div>

          {/* Fields */}
          <div className="space-y-5">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                Full name
              </label>
              {editing ? (
                <div className="space-y-1.5">
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setNameError(null);
                    }}
                    placeholder="Enter your full name"
                    className={`w-full rounded-lg border bg-[var(--surface-input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] ${
                      nameError
                        ? "border-red-300 dark:border-red-700"
                        : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                    }`}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void handleSave();
                      if (e.key === "Escape") setEditing(false);
                    }}
                  />
                  {nameError && (
                    <p className="text-xs text-red-500 dark:text-red-400">{nameError}</p>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => void handleSave()} loading={saving}>
                      <Save className="h-3.5 w-3.5" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditing(false);
                        setFullName(profile?.fullName ?? "");
                        setNameError(null);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[var(--text-primary)]">
                  {profile?.fullName || (
                    <span className="italic text-[var(--text-muted)]">No name set</span>
                  )}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-input)]/50 px-4 py-3">
              <Mail className="h-4 w-4 text-[var(--text-muted)]" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Email
                </p>
                <p className="text-sm text-[var(--text-primary)]">{profile?.email}</p>
              </div>
              {profile?.emailVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                  <XCircle className="h-3 w-3" />
                  Unverified
                </span>
              )}
            </div>

            {/* Account status */}
            <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-input)]/50 px-4 py-3">
              <Shield className="h-4 w-4 text-[var(--text-muted)]" />
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Account status
                </p>
                <p className="text-sm text-[var(--text-primary)]">
                  {profile?.isDisabled ? (
                    <span className="text-red-500 dark:text-red-400">Disabled</span>
                  ) : (
                    <span className="text-emerald-600 dark:text-emerald-400">Active</span>
                  )}
                </p>
              </div>
            </div>

            {/* Timestamps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-input)]/50 px-4 py-3">
                <Calendar className="h-4 w-4 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Member since
                  </p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {profile?.createdAt
                      ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-[var(--surface-input)]/50 px-4 py-3">
                <Clock className="h-4 w-4 text-[var(--text-muted)]" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    Last updated
                  </p>
                  <p className="text-sm text-[var(--text-primary)]">
                    {profile?.updatedAt
                      ? new Date(profile.updatedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Quick actions</h3>
        <div className="flex flex-wrap gap-3">
          <a
            href="/change-password"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--brand-500)] hover:text-[var(--brand-600)] dark:hover:text-[var(--brand-400)] transition-colors"
          >
            <Shield className="h-4 w-4" />
            Change password
          </a>
          <a
            href="/sessions"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--brand-500)] hover:text-[var(--brand-600)] dark:hover:text-[var(--brand-400)] transition-colors"
          >
            <Clock className="h-4 w-4" />
            Manage sessions
          </a>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <RequireAuth>
      <ProfileContent />
    </RequireAuth>
  );
}
