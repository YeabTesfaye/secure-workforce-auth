"use client";

import {
  Shield,
  Users,
  FolderKanban,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  Copy,
  type LucideIcon,
} from "lucide-react";

/* ── Role Badge ──────────────────────────────────────────────── */
const ROLE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  OWNER: { bg: "bg-amber-500/10 dark:bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  MANAGER: { bg: "bg-blue-500/10 dark:bg-blue-500/15", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/20" },
  HR_ADMINISTRATOR: { bg: "bg-purple-500/10 dark:bg-purple-500/15", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20" },
  EMPLOYEE: { bg: "bg-slate-500/10 dark:bg-slate-500/15", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/20" },
};

export function RoleBadge({ role }: { role: string }) {
  const colors = ROLE_COLORS[role] ?? ROLE_COLORS.EMPLOYEE;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} ${colors.border}`}>
      {role.replace(/_/g, " ")}
    </span>
  );
}

/* ── Status Badge ────────────────────────────────────────────── */
export function StatusBadge({ active = true, label }: { active?: boolean; label?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
      active
        ? "bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        : "bg-slate-500/10 dark:bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/20"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-slate-400"}`} />
      {label ?? (active ? "Active" : "Inactive")}
    </span>
  );
}

/* ── Stat Card ───────────────────────────────────────────────── */
interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  description?: string;
  color?: "green" | "blue" | "purple" | "amber" | "slate";
  className?: string;
}

const STAT_ICON_COLORS = {
  green: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  blue: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  purple: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/15 dark:text-purple-400",
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  slate: "bg-slate-500/10 text-slate-600 dark:bg-slate-500/15 dark:text-slate-400",
};

export function StatCard({ icon: Icon, label, value, description, color = "green", className = "" }: StatCardProps) {
  return (
    <div className={`rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 transition-all duration-200 hover:shadow-[var(--shadow-md)] hover:border-[var(--border-strong)] ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
          <p className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{value}</p>
          {description && <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>}
        </div>
        <div className={`rounded-lg p-2.5 ${STAT_ICON_COLORS[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

/* ── Empty State ─────────────────────────────────────────────── */
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Info, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--border-default)] bg-[var(--surface-card)] px-6 py-16 text-center">
      <div className="rounded-full bg-[var(--surface-input)] p-4 mb-4">
        <Icon className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-[var(--text-muted)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ── Page Header ─────────────────────────────────────────────── */
export function PageHeader({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 p-2.5">
            <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        )}
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">{title}</h1>
          {description && <p className="mt-0.5 text-sm text-[var(--text-muted)]">{description}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

/* ── Alert Banner ────────────────────────────────────────────── */
export function AlertBanner({
  type = "info",
  children,
}: {
  type?: "info" | "success" | "warning" | "error";
  children: React.ReactNode;
}) {
  const styles = {
    info: { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-300", Icon: Info },
    success: { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", Icon: CheckCircle2 },
    warning: { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", Icon: AlertTriangle },
    error: { bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-300", Icon: AlertTriangle },
  };
  const s = styles[type];
  return (
    <div className={`flex items-start gap-3 rounded-xl border ${s.bg} ${s.border} ${s.text} p-4 text-sm animate-fade-in`}>
      <s.Icon className="mt-0.5 h-5 w-5 flex-shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

/* ── Button ──────────────────────────────────────────────────── */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-500)] focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-[var(--brand-600)] text-white hover:bg-[var(--brand-500)] shadow-sm hover:shadow-md active:scale-[0.98]",
    secondary: "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-primary)] hover:bg-[var(--surface-card-hover)] hover:border-[var(--border-strong)]",
    ghost: "text-[var(--text-secondary)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)]",
    danger: "border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50",
  };
  const sizes = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
    lg: "h-11 px-6 text-sm",
  };
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={disabled || loading} {...props}>
      {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

/* ── Input ───────────────────────────────────────────────────── */
export function Input({
  label,
  error,
  className = "",
  ...props
}: {
  label?: string;
  error?: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary)]">{label}</label>
      )}
      <input
        className={`w-full rounded-lg border bg-[var(--surface-input)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--brand-500)] focus:border-transparent ${
          error
            ? "border-red-300 dark:border-red-700 focus:ring-red-500"
            : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────────── */
export function SkeletonLine({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`animate-shimmer rounded-lg ${className}`} style={{ height: "1rem", ...style }} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-5 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} className={i === 0 ? "w-3/4" : i === lines - 1 ? "w-1/2" : "w-full"} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b border-[var(--border-default)] pb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-3">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonLine key={colIdx} className={`flex-1 ${colIdx === 0 ? "w-1/3" : colIdx === cols - 1 ? "w-1/4" : "w-1/2"}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ cols = 3 }: { cols?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonCard key={i} lines={2} />
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
          <div className="space-y-2 flex-1">
            <SkeletonLine className="w-1/3" />
            <SkeletonLine className="w-2/3" style={{ height: "0.75rem" }} />
          </div>
          <SkeletonLine className="w-16 ml-4" style={{ height: "1.5rem" }} />
        </div>
      ))}
    </div>
  );
}

/* ── Exports for backward compat ─────────────────────────────── */
export { Shield, Users, FolderKanban, Activity, Clock };
