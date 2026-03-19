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
 * =====================================================
 *
 * Mirrors /api/auth/me response exactly.
 * Backend returns camelCase — no mapping needed.
 *
 * Role enum matches backend prisma schema:
 *   student | tutor | tutor_applicant | admin
 */

export type AuthUser = {
  id:                 string;
  email:              string | null;
  username:           string;
  role:               'student' | 'tutor' | 'tutor_applicant' | 'admin';
  disclaimerAccepted: boolean;
  isDemo:             boolean;
  demoExpiresAt:      string | null;
};

type AuthContextType = {
  user:            AuthUser | null;
  isLoading:       boolean;
  isAuthenticated: boolean;

  // Convenience role booleans — derived from user.role
  isStudent:       boolean;
  isTutor:         boolean;
  isTutorApplicant: boolean;
  isAdmin:         boolean;

  login:   (email: string, password: string) => Promise<void>;
  logout:  () => Promise<void>;
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

/**
 * /api/auth/me returns camelCase — map directly, no snake_case conversion.
 * Fields: id, email, username, role, disclaimerAccepted, isDemo, demoExpiresAt
 */
function mapUser(raw: any): AuthUser {
  return {
    id:                 String(raw.id),
    email:              raw.email ?? null,
    username:           String(raw.username),
    role:               raw.role,
    disclaimerAccepted: Boolean(raw.disclaimerAccepted),
    isDemo:             Boolean(raw.isDemo),
    demoExpiresAt:      raw.demoExpiresAt ?? null,
  };
}

/* =====================================================
 * PROVIDER
 * ===================================================== */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated  = user !== null;
  const isStudent        = user?.role === 'student';
  const isTutor          = user?.role === 'tutor';
  const isTutorApplicant = user?.role === 'tutor_applicant';
  const isAdmin          = user?.role === 'admin';

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

      if (!data?.success || !data?.user) {
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

  async function login(email: string, password: string) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok || !data?.success || !data?.user) {
      throw new Error(data?.error || 'Login failed');
    }

    // /api/auth/login response shape matches /api/auth/me user shape
    setUser(mapUser(data.user));
  }

  /* ================= LOGOUT ================= */

  async function logout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method:      'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
    }
  }

  /* ===================================================== */

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isStudent,
        isTutor,
        isTutorApplicant,
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