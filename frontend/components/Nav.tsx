"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { ThemeToggle } from "./ThemeToggle";
import { useState } from "react";
import {
  Shield,
  LayoutDashboard,
  Users,
  FolderKanban,
  Monitor,
  FileText,
  LogOut,
  ChevronDown,
  Menu,
  X,
  KeyRound,
  User,
} from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/members", label: "Members", icon: Users },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/sessions", label: "Sessions", icon: Monitor },
  { href: "/audit-logs", label: "Audit Logs", icon: FileText },
];

export function Nav() {
  const pathname = usePathname();
  const { user, organizations, currentOrg, setCurrentOrgId, logout } = useAuth();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--border-default)] bg-[var(--surface-bg)]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5 sm:px-6">
        {/* Logo + Desktop nav */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="rounded-lg bg-[var(--brand-600)] p-1.5">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="font-mono text-sm font-bold text-[var(--text-primary)] hidden sm:inline">SecureWorkforce</span>
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--brand-500)]/10 text-[var(--brand-600)] dark:text-[var(--brand-400)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)]"
                  }`}
                >
                  <link.icon className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Org switcher */}
          {organizations.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-sm text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-card-hover)] transition-all duration-200"
              >
                <span className="max-w-[140px] truncate font-medium">{currentOrg?.name}</span>
                <ChevronDown className={`h-3.5 w-3.5 text-[var(--text-muted)] transition-transform duration-200 ${orgDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {orgDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setOrgDropdownOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-xl border border-[var(--border-default)] bg-[var(--surface-elevated)] shadow-[var(--shadow-lg)] py-1 animate-slide-down">
                    <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Organization</p>
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          setCurrentOrgId(org.id);
                          setOrgDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
                          org.id === currentOrg?.id
                            ? "bg-[var(--brand-500)]/10 text-[var(--brand-600)] dark:text-[var(--brand-400)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-card-hover)] hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <span className="font-medium truncate">{org.name}</span>
                        <span className="text-xs text-[var(--text-muted)] rounded-full bg-[var(--surface-input)] px-2 py-0.5">
                          {org.roleName}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <ThemeToggle />

          {/* User menu */}
          <div className="flex items-center gap-2 border-l border-[var(--border-default)] pl-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-500)]/10 text-xs font-bold text-[var(--brand-600)] dark:text-[var(--brand-400)]">
                {(user.fullName ?? user.email)?.[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-[var(--text-secondary)] hidden lg:inline">{user.email}</span>
            </div>
            <Link
              href="/profile"
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)] transition-all duration-200"
              title="Profile"
            >
              <User className="h-4 w-4" />
            </Link>
            <Link
              href="/change-password"
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)] transition-all duration-200"
              title="Change password"
            >
              <KeyRound className="h-4 w-4" />
            </Link>
            <button
              onClick={() => { toast("info", "You have been signed out."); void logout(); }}
              className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-all duration-200"
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="border-t border-[var(--border-default)] bg-[var(--surface-bg)] px-4 py-3 md:hidden animate-slide-down">
          <div className="space-y-1">
            {LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--brand-500)]/10 text-[var(--brand-600)] dark:text-[var(--brand-400)]"
                      : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-card)]"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-3 space-y-2 border-t border-[var(--border-default)] pt-3">
            {/* Org switcher mobile */}
            {organizations.length > 0 && (
              <select
                className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-input)] px-3 py-2 text-sm text-[var(--text-primary)]"
                value={currentOrg?.id ?? ""}
                onChange={(e) => {
                  setCurrentOrgId(e.target.value);
                  setMobileMenuOpen(false);
                }}
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.roleName})
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center justify-between rounded-lg bg-[var(--surface-card)] px-3 py-2">
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--brand-500)]/10 text-[10px] font-bold text-[var(--brand-600)] dark:text-[var(--brand-400)]">
                  {(user.fullName ?? user.email)?.[0]?.toUpperCase()}
                </div>
                <span className="text-sm text-[var(--text-secondary)]">{user.email}</span>
              </Link>
              <div className="flex items-center gap-1">
                <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-input)] hover:text-[var(--text-primary)] transition-colors" title="Profile">
                  <User className="h-4 w-4" />
                </Link>
                <Link href="/change-password" onClick={() => setMobileMenuOpen(false)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-input)] hover:text-[var(--text-primary)] transition-colors" title="Change password">
                  <KeyRound className="h-4 w-4" />
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    toast("info", "You have been signed out.");
                    void logout();
                  }}
                  className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-500 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
