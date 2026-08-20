"use client";

import { useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { Button, PageHeader } from "@/components/ui";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
} from "lucide-react";

function ChangePasswordContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password strength checks (matching backend schema)
  const checks = [
    { label: "At least 12 characters", valid: newPassword.length >= 12 },
    { label: "Contains uppercase letter", valid: /[A-Z]/.test(newPassword) },
    { label: "Contains lowercase letter", valid: /[a-z]/.test(newPassword) },
    { label: "Contains a digit", valid: /[0-9]/.test(newPassword) },
    { label: "Contains a symbol", valid: /[^a-zA-Z0-9]/.test(newPassword) },
  ];
  const strength = checks.filter((c) => c.valid).length;

  async function handleSubmit() {
    setError(null);

    if (!currentPassword) {
      setError("Current password is required");
      return;
    }
    if (!newPassword) {
      setError("New password is required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (strength < 5) {
      setError("New password does not meet all requirements");
      return;
    }

    setSubmitting(true);
    try {
      await api("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      setSuccess(true);
      toast("success", "Password changed successfully. Other sessions have been revoked.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to change password.";
      setError(message);
      toast("error", message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl animate-fade-in">
      <PageHeader
        icon={KeyRound}
        title="Change Password"
        description="Update your account password. Your other sessions will be revoked for security."
      />

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm text-emerald-700 dark:text-emerald-300 animate-fade-in">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-500" />
          <div>
            <p className="font-medium">Password changed successfully</p>
            <p className="mt-1 text-emerald-600/80 dark:text-emerald-400/80">
              All other sessions have been revoked. You remain signed in on this device.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-600 dark:text-red-400 animate-fade-in">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 space-y-5">
        {/* Current password */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Current password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => { setCurrentPassword(e.target.value); setError(null); setSuccess(false); }}
              placeholder="Enter current password"
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] pl-10 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] hover:border-[var(--border-strong)]"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* New password */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            New password
          </label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => { setNewPassword(e.target.value); setError(null); setSuccess(false); }}
              placeholder="Enter new password"
              className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] pl-10 pr-10 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] hover:border-[var(--border-strong)]"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Confirm new password */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Confirm new password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type={showNew ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(null); setSuccess(false); }}
              placeholder="Confirm new password"
              className={`w-full rounded-lg border bg-[var(--surface-input)] pl-10 pr-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] ${
                confirmPassword && confirmPassword !== newPassword
                  ? "border-red-300 dark:border-red-700"
                  : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
              }`}
            />
          </div>
          {confirmPassword && confirmPassword !== newPassword && (
            <p className="mt-1 text-xs text-red-500 dark:text-red-400">Passwords do not match</p>
          )}
        </div>

        {/* Password strength */}
        {newPassword && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Password strength</span>
              <span className={`text-xs font-medium ${
                strength <= 2 ? "text-red-500" : strength <= 4 ? "text-amber-500" : "text-emerald-500"
              }`}>
                {strength <= 2 ? "Weak" : strength <= 4 ? "Moderate" : "Strong"}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-input)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  strength <= 2 ? "bg-red-500" : strength <= 4 ? "bg-amber-500" : "bg-emerald-500"
                }`}
                style={{ width: `${(strength / 5) * 100}%` }}
              />
            </div>
            <div className="grid grid-cols-1 gap-1">
              {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2 text-xs">
                  <div className={`h-1.5 w-1.5 rounded-full ${c.valid ? "bg-emerald-500" : "bg-[var(--text-muted)]/30"}`} />
                  <span className={c.valid ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--text-muted)]"}>
                    {c.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button
          className="w-full"
          size="lg"
          onClick={() => void handleSubmit()}
          loading={submitting}
          disabled={!currentPassword || !newPassword || !confirmPassword}
        >
          <KeyRound className="h-4 w-4" />
          Change password
        </Button>
      </div>
    </div>
  );
}

export default function ChangePasswordPage() {
  return (
    <RequireAuth>
      <ChangePasswordContent />
    </RequireAuth>
  );
}
