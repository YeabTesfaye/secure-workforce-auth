"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, type CurrentUser, type Organization } from "./api";

interface AuthState {
  user: CurrentUser | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  loading: boolean;
  setCurrentOrgId: (id: string) => void;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

// This context only ever mirrors what the API told it. It never decides
// on its own whether the user is "allowed" to do something -- every page
// that needs to know a permission just calls the relevant API endpoint and
// renders based on the real 200/403 it gets back (see e.g. app/members/page.tsx).
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const me = await api<{ data: CurrentUser }>("/users/me");
      setUser(me.data);
      const orgs = await api<{ data: Organization[] }>("/organizations");
      setOrganizations(orgs.data);
      setCurrentOrgIdState((prev) => prev ?? orgs.data[0]?.id ?? null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        setOrganizations([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const logout = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch {
      // Even if the network call fails, clear local state and send the
      // user to login -- the worst case is an already-dead session cookie.
    }
    setUser(null);
    setOrganizations([]);
    router.push("/login");
  }, [router]);

  const currentOrg = organizations.find((o) => o.id === currentOrgId) ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        loading,
        setCurrentOrgId: setCurrentOrgIdState,
        logout,
        refresh: loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
