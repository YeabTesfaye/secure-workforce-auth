"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Shield,
  Lock,
  Users,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Fingerprint,
  Globe,
  Zap,
  LayoutDashboard,
} from "lucide-react";

const FEATURES = [
  {
    icon: Shield,
    title: "Multi-Tenant RBAC",
    description: "Organization-scoped roles with fine-grained permission checks. Every endpoint enforces tenant isolation.",
  },
  {
    icon: Lock,
    title: "Refresh Token Rotation",
    description: "Single-use refresh tokens with family-based reuse detection. Stolen tokens are caught and revoked.",
  },
  {
    icon: Fingerprint,
    title: "Resource-Level Authz",
    description: "Beyond RBAC — per-resource ownership checks ensure users can only modify what they manage.",
  },
  {
    icon: KeyRound,
    title: "Argon2id Passwords",
    description: "Memory-hard hashing with automatic breach detection via HaveIBeenPwned k-anonymity API.",
  },
  {
    icon: Globe,
    title: "CSRF Protection",
    description: "Double-submit cookie pattern with SameSite attributes for state-changing requests.",
  },
  {
    icon: Zap,
    title: "Rate Limiting",
    description: "Redis-backed per-route rate limiting with brute-force protection and account lockout.",
  },
];

const SECURITY_CHECKS = [
  "Cross-tenant isolation tested against real PostgreSQL",
  "JWT algorithm confusion and tamper attacks blocked",
  "Timing-safe login prevents account enumeration",
  "67+ security tests run in CI on every push",
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* ── Nav ──────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-[var(--surface-bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-[var(--brand-600)] p-1.5">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="font-mono text-sm font-bold text-[var(--text-primary)]">SecureWorkforce</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-500)] transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-[var(--brand-600)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-500)] transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-[var(--brand-500)]/5 blur-3xl" />
        </div>

        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32 text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-500)]/20 bg-[var(--brand-500)]/5 px-4 py-1.5 text-xs font-medium text-[var(--brand-600)] dark:text-[var(--brand-400)] mb-8">
              <ShieldCheck className="h-3.5 w-3.5" />
              Production-grade security, fully tested
            </div>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-6xl lg:text-7xl animate-slide-up stagger-1">
            Auth platform you can{" "}
            <span className="bg-gradient-to-r from-[var(--brand-500)] to-emerald-400 bg-clip-text text-transparent">
              trust
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-[var(--text-secondary)] animate-slide-up stagger-2">
            Multi-tenant authentication and authorization with RBAC, refresh-token rotation,
            resource-level access control, and 67+ security tests against real Postgres and Redis.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-slide-up stagger-3">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-600)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--brand-600)]/25 hover:bg-[var(--brand-500)] hover:shadow-xl hover:shadow-[var(--brand-600)]/30 transition-all duration-200 active:scale-[0.98]"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-600)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--brand-600)]/25 hover:bg-[var(--brand-500)] hover:shadow-xl hover:shadow-[var(--brand-600)]/30 transition-all duration-200 active:scale-[0.98]"
                >
                  Create an account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-card-hover)] hover:border-[var(--border-strong)] transition-all duration-200"
                >
                  Sign in to demo
                </Link>
              </>
            )}
          </div>

          <div className="mt-16 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-[var(--text-muted)] animate-fade-in stagger-5">
            {SECURITY_CHECKS.map((check) => (
              <div key={check} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-[var(--brand-500)]" />
                {check}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────── */}
      <section className="border-t border-[var(--border-default)] bg-[var(--surface-card)]/50">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">Security-first architecture</h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              Every feature is backed by an executable test, not just documentation.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className={`group rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-6 transition-all duration-300 hover:shadow-[var(--shadow-lg)] hover:border-[var(--brand-500)]/30 hover:-translate-y-0.5 animate-slide-up stagger-${i + 1}`}
              >
                <div className="mb-4 inline-flex rounded-lg bg-[var(--brand-500)]/10 p-2.5 transition-colors duration-300 group-hover:bg-[var(--brand-500)]/20">
                  <feature.icon className="h-5 w-5 text-[var(--brand-600)] dark:text-[var(--brand-400)]" />
                </div>
                <h3 className="text-base font-semibold text-[var(--text-primary)]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="border-t border-[var(--border-default)]">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6 text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)]">Ready to explore?</h2>
          <p className="mt-3 text-[var(--text-secondary)]">
            Sign up or log in with a pre-seeded demo account to see RBAC, multi-tenant isolation, and resource-level authorization in action.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-600)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--brand-600)]/25 hover:bg-[var(--brand-500)] transition-all duration-200"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-600)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--brand-600)]/25 hover:bg-[var(--brand-500)] transition-all duration-200"
                >
                  Create an account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-card-hover)] transition-all duration-200"
                >
                  Sign in to demo
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-default)] py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-muted)]">SecureWorkforce Auth Platform</span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">Multi-tenant auth with 67+ security tests against real Postgres & Redis</p>
        </div>
      </footer>
    </div>
  );
}
