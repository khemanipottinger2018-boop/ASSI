'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* =====================================================
 * TYPES
 *
 * Mirrors GET /api/user/settings response exactly.
 * ===================================================== */

export type UserSettings = {
  emailNotifications: boolean;
  pushNotifications:  boolean;
  theme:              'light' | 'dark' | 'system';
  language:           string;
  timezone:           string;
  assiEnabled:        boolean;
  assiPosition:       { x: number; y: number } | null;
  themePreference:    string;
  reduceMotion:       boolean;
};

type SettingsContextType = {
  settings:  UserSettings | null;
  isLoading: boolean;
  update:    (patch: Partial<UserSettings>) => Promise<void>;
  refresh:   () => Promise<void>;
};

/* =====================================================
 * CONTEXT
 * ===================================================== */

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/* =====================================================
 * PROVIDER
 * ===================================================== */

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading: authIsLoading } = useAuth();
  const [settings,  setSettings]  = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ================= LOAD ================= */

  async function refresh() {
    if (!isAuthenticated) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/user/settings`, {
        credentials: 'include',
      });

      if (!res.ok) {
        setSettings(null);
        return;
      }

      const data = await res.json();
      if (data?.success && data?.settings) {
        setSettings(data.settings);
      }
    } catch {
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }

  /* ================= UPDATE ================= */

  async function update(patch: Partial<UserSettings>) {
    if (!isAuthenticated || !patch || !Object.keys(patch).length) return;

    // Optimistic update
    setSettings(prev => prev ? { ...prev, ...patch } : prev);

    try {
      const res = await fetch(`${API_URL}/api/user/settings`, {
        method:      'PATCH',
        headers:     { 'Content-Type': 'application/json' },
        credentials: 'include',
        body:        JSON.stringify(patch),
      });

      if (!res.ok) {
        await refresh();
      }
    } catch {
      await refresh();
    }
  }

  /* ================= HYDRATE ================= */

  useEffect(() => {
    if (authIsLoading) return;
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authIsLoading]);

  return (
    <SettingsContext.Provider value={{ settings, isLoading, update, refresh }}>
      {children}
    </SettingsContext.Provider>
  );
}

/* =====================================================
 * HOOK
 * ===================================================== */

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return ctx;
}