'use client';

/**
 * useStreak
 *
 * Fetches the current user's login streak from GET /api/user/streak.
 * Safe defaults for new users — currentStreak and longestStreak are
 * always numbers, lastActiveAt is null until first login after migration.
 *
 * Only fetches when authenticated.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth';
import { userApi } from '@/lib/api';
import type { UserStreak } from '@/lib/api/user';

const DEFAULT_STREAK: UserStreak = {
  currentStreak: 0,
  longestStreak: 0,
  lastActiveAt:  null,
};

export function useStreak() {
  const { isAuthenticated } = useAuth();

  const [streak,    setStreak]    = useState<UserStreak>(DEFAULT_STREAK);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const data = await userApi.getStreak();
      if (data.success) setStreak(data.streak);
    } catch {
      setError('Could not load streak');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch — runs on mount and when auth state changes.
  useEffect(() => {
    if (!isAuthenticated) {
      setStreak(DEFAULT_STREAK);
      setIsLoading(false);
      return;
    }
    refresh();
  }, [isAuthenticated, refresh]);

  // Re-fetch when the user returns to the tab so the streak count is always
  // current (backend updates on each daily login, frontend might be stale).
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [refresh]);

  return { streak, isLoading, error, refresh };
}
