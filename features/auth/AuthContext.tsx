'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

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
  user:             AuthUser | null;
  isLoading:        boolean;
  isAuthenticated:  boolean;

  isStudent:        boolean;
  isTutor:          boolean;
  isTutorApplicant: boolean;
  isAdmin:          boolean;

  login:   (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout:  () => Promise<void>;
  refresh: () => Promise<AuthUser | null>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

export const REMEMBER_ME_KEY = 'assi:remember_me';

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated  = user !== null;
  const isStudent        = user?.role === 'student';
  const isTutor          = user?.role === 'tutor';
  const isTutorApplicant = user?.role === 'tutor_applicant';
  const isAdmin          = user?.role === 'admin';

  async function refresh(): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
      if (!res.ok) { setUser(null); return null; }
      const data = await res.json();
      if (!data?.success || !data?.user) { setUser(null); return null; }
      const mapped = mapUser(data.user);
      setUser(mapped);
      return mapped;
    } catch {
      setUser(null);
      return null;
    }
  }

  useEffect(() => {
    (async () => {
      await refresh();
      setIsLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Login ──
  // rememberMe controls:
  //   1. Cookie TTL (passed to backend — backend sets session vs persistent cookie)
  //   2. localStorage flag read by useStreak to decide if this session counts
  async function login(email: string, password: string, rememberMe = false) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      credentials: 'include',
      body:        JSON.stringify({ email, password, rememberMe }),
    });

    const data = await res.json();
    if (!res.ok || !data?.success || !data?.user) {
      throw new Error(data?.error || 'Login failed');
    }

    // Persist the rememberMe flag — useStreak reads this to gate streak counting
    localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));

    setUser(mapUser(data.user));
  }

  // ── Logout ──
  async function logout() {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST', credentials: 'include',
      });
    } finally {
      localStorage.removeItem(REMEMBER_ME_KEY);
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider value={{
      user, isLoading, isAuthenticated,
      isStudent, isTutor, isTutorApplicant, isAdmin,
      login, logout, refresh,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}