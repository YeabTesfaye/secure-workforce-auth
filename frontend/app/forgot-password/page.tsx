"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Shield,
  Mail,
  ArrowLeft,
  CheckCircle2,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[var(--brand-500)] border-t-transparent" />
      </div>
    );
  }

  if (user) return null;

  async function handleSubmit() {
    setError(null);
    setEmailError(null);

    // Client-side validation
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setSubmitting(true);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim().toLowerCase() },
      });
      setSent(true);
      toast("success", "Reset link sent! Check your inbox.");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Something went wrong. Try again.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left: Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-[var(--brand-600)] via-[var(--brand-700)] to-emerald-700">
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="rounded-xl bg-white/20 p-3">
              <Shield className="h-8 w-8" />
            </div>
            <span className="text-2xl font-bold tracking-tight">SecureWorkforce</span>
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            Don&apos;t worry, we&apos;ll get you back in.
          </h2>
          <p className="mt-4 text-lg text-white/80 max-w-md">
            Enter your email and we&apos;ll send you a secure link to reset your
            password. The link expires after a limited time for your safety.
          </p>
        </div>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyem0wLTRWMjhIMjR2Mmgxem0tMTItNHYySDI0di0yaDE0eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
      </div>

      {/* Right: Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 py-12 bg-[var(--background)]">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-2 lg:hidden mb-4">
            <div className="rounded-xl bg-[var(--brand-500)]/10 p-2.5">
              <Shield className="h-6 w-6 text-[var(--brand-600)] dark:text-[var(--brand-400)]" />
            </div>
            <span className="text-xl font-bold text-[var(--text-primary)]">SecureWorkforce</span>
          </div>

          {sent ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-center">
                <div className="rounded-full bg-emerald-500/10 p-4">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="text-center">
                <h1 className="text-xl font-bold text-[var(--text-primary)]">Check your email</h1>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  If an account exists for <span className="font-medium text-[var(--text-primary)]">{email}</span>,
                  we&apos;ve sent a password reset link. Check your inbox and follow the instructions.
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4 text-center">
                <p className="text-xs text-[var(--text-muted)]">
                  Didn&apos;t receive the email? Check your spam folder, or{" "}
                  <button
                    onClick={() => { setSent(false); setEmail(""); }}
                    className="font-medium text-[var(--brand-600)] dark:text-[var(--brand-400)] hover:underline"
                  >
                    try a different email
                  </button>.
                </p>
              </div>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--brand-600)] dark:text-[var(--brand-400)] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)]">Forgot your password?</h1>
                <p className="mt-1.5 text-sm text-[var(--text-muted)]">
                  Enter your email address and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setEmailError(null);
                        setError(null);
                      }}
                      placeholder="you@example.com"
                      className={`w-full rounded-lg border bg-[var(--surface-input)] pl-10 pr-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] ${
                        emailError
                          ? "border-red-300 dark:border-red-700"
                          : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                      }`}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && email.trim()) void handleSubmit();
                      }}
                    />
                  </div>
                  {emailError && (
                    <p className="mt-1 text-xs text-red-500 dark:text-red-400">{emailError}</p>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => void handleSubmit()}
                  loading={submitting}
                  disabled={!email.trim()}
                >
                  <Send className="h-4 w-4" />
                  Send reset link
                </Button>
              </div>

              <Link
                href="/login"
                className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--brand-600)] dark:text-[var(--brand-400)] hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
