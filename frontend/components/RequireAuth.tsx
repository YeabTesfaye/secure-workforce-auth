"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Nav } from "./Nav";
import { ErrorBoundary } from "./ErrorBoundary";
import { Shield } from "lucide-react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-xl bg-[var(--brand-500)]/10 p-3">
            <Shield className="h-6 w-6 text-[var(--brand-500)] animate-pulse" />
          </div>
          <span className="text-sm font-medium text-[var(--text-muted)]">Loading...</span>
        </div>
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  );
}
