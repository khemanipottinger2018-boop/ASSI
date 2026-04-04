'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/features/auth';
import { userApi } from '@/lib/api';
import type { UserQuota } from '@/lib/api';

export type UseUserQuotaReturn = {
  quota:   UserQuota | null;
  loading: boolean;
  error:   string | null;
  refresh: () => Promise<void>;
  /** Returns true if the user has capacity remaining for the given resource. */
  canUse:  (resource: keyof UserQuota) => boolean;
};

export function useUserQuota(): UseUserQuotaReturn {
  const { isAuthenticated } = useAuth();

  const [quota,   setQuota]   = useState<UserQuota | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const data = await userApi.getQuota();
      setQuota(data.quota);
    } catch {
      setError('Could not load quota');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const canUse = useCallback((resource: keyof UserQuota): boolean => {
    if (!quota) return true; // optimistic default — let backend enforce
    const { used, limit } = quota[resource];
    return used < limit;
  }, [quota]);

  useEffect(() => {
    if (!isAuthenticated) {
      setQuota(null);
      setError(null);
      return;
    }
    refresh();
  }, [isAuthenticated, refresh]);

  return { quota, loading, error, refresh, canUse };
}
