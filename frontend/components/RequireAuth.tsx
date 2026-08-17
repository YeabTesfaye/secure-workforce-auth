"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Nav } from "./Nav";

// This is a convenience redirect for the demo's UX only -- it is NOT a
// security boundary. The real boundary is the API: every fetch call in
// these pages requires a valid session cookie or it gets a real 401/403
// from the backend, regardless of what this component does. A user could
// disable JavaScript entirely and the API would still enforce everything.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading...</div>;
  }
  if (!user) return null;

  return (
    <div>
      <Nav />
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
