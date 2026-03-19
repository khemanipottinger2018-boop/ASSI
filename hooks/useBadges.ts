'use client';

/**
 * useBadges
 *
 * Fetches the current user's earned badges from GET /api/user/badges.
 * Returns [] for users with no badges — always safe to map.
 *
 * Only fetches when authenticated.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { userApi } from '@/lib/api';
import type { UserBadge } from '@/lib/api/user';

export function useBadges() {
  const { isAuthenticated } = useAuth();

  const [badges,    setBadges]    = useState<UserBadge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setBadges([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    userApi.getBadges()
      .then(data => {
        if (data.success) setBadges(data.badges);
      })
      .catch(() => setError('Could not load badges'))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  return { badges, isLoading, error };
}