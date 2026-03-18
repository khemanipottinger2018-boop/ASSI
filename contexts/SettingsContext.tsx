'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useAuth } from './AuthContext';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* =====================================================
 * TYPES
 * ===================================================== */

export type UserSettings = {
  assi_enabled: boolean;
  assi_position: { x: number; y: number } | null;
  theme_preference: 'system' | 'light' | 'dark';
  reduce_motion: boolean;
};

type SettingsContextType = {
  settings: UserSettings | null;
  isLoading: boolean;
  update: <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => Promise<void>;
  refresh: () => Promise<void>;
};

/* =====================================================
 * CONTEXT
 * ===================================================== */

const SettingsContext = createContext<
  SettingsContextType | undefined
>(undefined);

/* =====================================================
 * PROVIDER
 * ===================================================== */

export function SettingsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();
  const [settings, setSettings] =
    useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ================= LOAD ================= */

  async function refresh() {
    if (!isAuthenticated) {
      setSettings(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/api/user/settings`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        setSettings(null);
        return;
      }

      const data = await res.json();
      setSettings(data.settings);
    } catch {
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }

  /* ================= UPDATE ================= */

  async function update<
    K extends keyof UserSettings
  >(key: K, value: UserSettings[K]) {
    if (!isAuthenticated) return;

    // Optimistic update
    setSettings(prev =>
      prev ? { ...prev, [key]: value } : prev
    );

    try {
      await fetch(`${API_URL}/api/user/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key, value }),
      });
    } catch {
      // Rollback on failure
      await refresh();
    }
  }

  /* ================= HYDRATE ================= */

  useEffect(() => {
    refresh();
  }, [user?.id]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isLoading,
        update,
        refresh,
      }}
    >
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
    throw new Error(
      'useSettings must be used within SettingsProvider'
    );
  }
  return ctx;
}
