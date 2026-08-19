"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const DEMO_ACCOUNTS = [
  { email: "alice@acme.com", note: "OWNER at Acme Corporation, EMPLOYEE at Startup Inc" },
  { email: "bob@acme.com", note: "MANAGER at Acme Corporation" },
  { email: "carol@acme.com", note: "EMPLOYEE at Acme Corporation" },
  { email: "david@acme.com", note: "HR_ADMINISTRATOR at Acme Corporation" },
  { email: "erin@startupinc.com", note: "OWNER at Startup Inc" },
];

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validateForm(): string | null {
    if (!email) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email address.";
    if (!password) return "Password is required.";
    if (password.length < 1) return "Password is required.";
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

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-1 font-mono text-lg font-semibold text-emerald-400">SecureWorkforce</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in with a seeded demo account, or your own.</p>

        <form onSubmit={handleSubmit} className="space-y-3" noValidate>
          <div>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-800 pt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">
            Seeded demo accounts (password: DemoPassword123!)
          </p>
          <ul className="space-y-1 text-xs text-slate-400">
            {DEMO_ACCOUNTS.map((acc) => (
              <li key={acc.email}>
                <button
                  type="button"
                  className="text-emerald-400 hover:underline"
                  onClick={() => setEmail(acc.email)}
                >
                  {acc.email}
                </button>{" "}
                — {acc.note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
