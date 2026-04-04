'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { useAuth }  from '@/features/auth';
import { useTheme } from '@/features/themes/core/ThemeProvider';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

/* =====================================================
 * TYPES
 * ===================================================== */

export type UserSettings = {
  emailNotifications: boolean;
  pushNotifications:  boolean;
  language:           string;
  timezone:           string;
  assiEnabled:        boolean;
  assiPosition:       { x: number; y: number } | null;
  reduceMotion:       boolean;
  // Theme — persisted to DB, owned by ThemeProvider
  colorMode:    string;
  themeGroup:   string;
  themeVariant: string;
  // Feature flags — returned by GET /api/user/settings
  themesEnabled:       boolean;
  dynamicThemes:       boolean;
  streakEnabled:       boolean;
  streakNotifications: boolean;
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
  const { hydrateFromServer, resetTheme } = useTheme();

  const [settings,  setSettings]  = useState<UserSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ── LOAD ── */

  async function refresh() {
    if (!isAuthenticated) {
      setSettings(null);
      resetTheme();
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

        // Hand theme prefs to ThemeProvider — it overwrites localStorage
        // with the DB truth and marks itself as hydrated so future changes
        // start persisting back to the DB
        hydrateFromServer({
          colorMode:    data.settings.colorMode    ?? 'dark',
          themeGroup:   data.settings.themeGroup   ?? 'lavalamp',
          themeVariant: data.settings.themeVariant ?? 'assi',
        });
      }
    } catch {
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
  }

  /* ── UPDATE ── */

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

      if (!res.ok) await refresh();
    } catch {
      await refresh();
    }
  }

  /* ── HYDRATE on auth ready ── */

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
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
