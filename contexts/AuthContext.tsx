'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

/* =====================================================
 * TYPES
 * ===================================================== */

/**
 * Mirrors the full `/api/auth/me` response payload.
 * All fields are present — nothing dropped on the way in.
 */
export type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: 'student' | 'tutor' | 'admin' | 'tutor-applicant';
  avatarUrl: string | null;
  disclaimerAccepted: boolean;
  isDemo: boolean;
  demoExpiresAt: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Convenience role booleans — derived from user.role so
  // components never have to do string comparisons themselves.
  isStudent: boolean;
  isTutor: boolean;
  isAdmin: boolean;

  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
};

/* =====================================================
 * CONTEXT
 * ===================================================== */

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* =====================================================
 * HELPERS
 * ===================================================== */

/** Map the raw snake_case API response to our camelCase AuthUser. */
function mapUser(raw: any): AuthUser {
  return {
    id:                 String(raw.id),
    email:              String(raw.email),
    username:           String(raw.username),
    role:               raw.role,
    avatarUrl:          raw.avatar_url ?? null,
    disclaimerAccepted: Boolean(raw.disclaimer_accepted),
    isDemo:             Boolean(raw.is_demo),
    demoExpiresAt:      raw.demo_expires_at ?? null,
  };
}

/* =====================================================
 * PROVIDER
 * ===================================================== */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = user !== null;
  const isStudent = user?.role === 'student';
  const isTutor   = user?.role === 'tutor' || user?.role === 'tutor-applicant';
  const isAdmin   = user?.role === 'admin';

  /* ================= REHYDRATE SESSION ================= */

  async function refresh(): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      });

      if (!res.ok) {
        setUser(null);
        return null;
      }

      const data = await res.json();

      if (!data?.user) {
        setUser(null);
        return null;
      }

      const mapped = mapUser(data.user);
      setUser(mapped);
      return mapped;
    } catch {
      setUser(null);
      return null;
    }
  }

  /* ================= INITIAL BOOTSTRAP ================= */

  useEffect(() => {
    (async () => {
      await refresh();
      setIsLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= LOGIN ================= */

  async function login(email: string, password: string, rememberMe = true) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, rememberMe }),
    });

    const data = await res.json();

    if (!res.ok || !data?.success || !data?.user) {
      throw new Error(data?.error || 'Login failed');
    }

    setUser(mapUser(data.user));
  }

  /* ================= LOGOUT ================= */

  async function logout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
    }
  }

  /* =====================================================
   * PROVIDER VALUE
   * ===================================================== */

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isStudent,
        isTutor,
        isAdmin,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* =====================================================
 * HOOK
 * ===================================================== */

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
