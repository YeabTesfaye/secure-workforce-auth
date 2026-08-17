"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/members", label: "Members" },
  { href: "/projects", label: "Projects" },
  { href: "/sessions", label: "Sessions" },
  { href: "/audit-logs", label: "Audit Logs" },
];

// This nav shows every link to every user regardless of role -- it does NOT
// hide items based on a client-side guess about permissions. Pages like
// /members and /audit-logs make the real API call and render an "access
// denied" state if the backend returns 403. That's the point: the backend
// stays authoritative, and the UI never pretends to know better than it does.
export function Nav() {
  const pathname = usePathname();
  const { user, organizations, currentOrg, setCurrentOrgId, logout } = useAuth();

  if (!user) return null;

  return (
    <nav className="border-b border-slate-800 bg-slate-950/60 px-6 py-3">
      <div className="mx-auto flex max-w-5xl items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-mono text-sm font-semibold text-emerald-400">SecureWorkforce</span>
          <div className="flex gap-4">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm ${
                  pathname === link.href ? "text-emerald-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {organizations.length > 0 && (
            <select
              className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-200"
              value={currentOrg?.id ?? ""}
              onChange={(e) => setCurrentOrgId(e.target.value)}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.roleName})
                </option>
              ))}
            </select>
          )}
          <span className="text-sm text-slate-400">{user.email}</span>
          <button
            onClick={() => void logout()}
            className="rounded border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
          >
            Log out
          </button>
        </div>
      </div>
    </nav>
  );
}
