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

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!isAuthenticated) {
      setStreak(DEFAULT_STREAK);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    userApi.getStreak()
      .then(data => {
        if (data.success) setStreak(data.streak);
      })
      .catch(() => setError('Could not load streak'))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  return { streak, isLoading, error };
}
