"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import {
  Shield,
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  User,
  Briefcase,
  Crown,
} from "lucide-react";

const DEMO_ACCOUNTS = [
  { email: "alice@acme.com", note: "OWNER at Acme Corp, EMPLOYEE at Startup Inc", icon: Crown, color: "text-amber-500" },
  { email: "bob@acme.com", note: "MANAGER at Acme Corporation", icon: Briefcase, color: "text-blue-500" },
  { email: "carol@acme.com", note: "EMPLOYEE at Acme Corporation", icon: User, color: "text-slate-500" },
  { email: "david@acme.com", note: "HR_ADMINISTRATOR at Acme Corporation", icon: User, color: "text-purple-500" },
  { email: "erin@startupinc.com", note: "OWNER at Startup Inc", icon: Crown, color: "text-amber-500" },
];

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, refresh } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validateForm(): string | null {
    if (!email) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    if (!password) return "Password is required.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      await api("/auth/login", { method: "POST", body: { email, password } });
      await refresh();
      toast("success", "Welcome back! You are now signed in.");
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 423 ? err.message : "Invalid email or password.");
      } else {
        setError("Could not reach the API.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-(--brand-500) border-t-transparent" />
      </div>
    );
  }

  function quickFill(e: string) {
    setEmail(e);
    setPassword("DemoPassword123!");
    setError(null);
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* ── Left branding panel ───────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0  bg-linear-to-br  from-(--brand) to-emerald-700" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptMC0zMHY2aDZ2LTZoLTZ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <Shield className="h-7 w-7 text-white" />
            </div>
            <span className="font-mono text-xl font-bold text-white">SecureWorkforce</span>
          </div>
          <h2 className="text-3xl font-bold text-white leading-tight">
            Welcome back to<br />
            secure access
          </h2>
          <p className="mt-4 max-w-md text-base text-white/80 leading-relaxed">
            Sign in to manage your organizations, projects, and team members with
            enterprise-grade authorization.
          </p>
          <div className="mt-10 space-y-4">
            {["Multi-tenant isolation", "Resource-level authorization", "Real-time audit logging"].map((item) => (
              <div key={item} className="flex items-center gap-3 text-sm text-white/90">
                <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="rounded-lg  bg-(--brand) p-1.5">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-mono text-sm font-bold text-(--text-primary)]">SecureWorkforce</span>
          </div>

          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold  text-(--text-primary)">Sign in</h1>
            <p className="mt-2 text-sm  text-(--text-muted)]">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="font-medium  hover:underline text-(--brand-600)] dark:text-(--brand-400)]">
                Create one
              </Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4 animate-slide-up stagger-1" noValidate>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-(--text-secondary)]">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-muted)]" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full rounded-lg border border-(--border-default) bg-(--surface-input) pl-10 pr-3.5 py-2.5 text-sm text-(--text-primary) placeholder:text-(--text-muted) transition-colors focus:outline-none focus:ring-2 focus:ring-(--brand-500) focus:border-transparent hover:border-(--border-strong)"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-(--text-secondary)]">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-(--text-muted)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-(--border-default) bg-(--surface-input) pl-10 pr-10 py-2.5 text-sm text-(--text-primary) placeholder:text-(--text-muted) transition-colors focus:outline-none focus:ring-2 focus:ring-(--brand-500) focus:border-transparent hover:border-(--border-strong)"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--text-muted)] hover:text-(--text-secondary)] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-600 dark:text-red-400 animate-fade-in">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs font-medium text-(--brand-600)] dark:text-(--brand-400)] hover:underline">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-(--brand-600) px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-(--brand-600)/25 hover:bg-(--brand-500) hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]"
            >
              {submitting ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-8 border-t border-(--border-default) pt-6 animate-slide-up stagger-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-(--text-muted)]">
              Demo accounts
            </p>
            <p className="mb-3 text-xs text-(--text-muted)]">
              Password: <code className="rounded bg-(--surface-input) px-1.5 py-0.5 font-mono text-(--text-secondary)]">DemoPassword123!</code>
            </p>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => quickFill(acc.email)}
                  className={`group w-full flex items-center gap-3 rounded-lg border border-(--border-default) bg-(--surface-card) px-3 py-2.5 text-left transition-all duration-200 hover:border-(--brand-500)/30 hover:bg-(--surface-card-hover) hover:shadow-(--shadow-sm) ${email === acc.email ? "border-(--brand-500)/30 bg-(--brand-500)/5" : ""}`}
                >
                  <div className={`rounded-md p-1.5 bg-(--surface-input) ${acc.color} group-hover:bg-(--brand-500)/10 transition-colors`}>
                    <acc.icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-(--text-primary)] truncate">{acc.email}</p>
                    <p className="text-[11px] text- (--text-muted)] truncate">{acc.note}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
