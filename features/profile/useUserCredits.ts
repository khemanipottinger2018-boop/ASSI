'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth }   from '@/features/auth';
import { userApi }   from '@/lib/api';
import type { CreditTransaction } from '@/lib/api';

export type UseUserCreditsReturn = {
  balance:      number | null;
  transactions: CreditTransaction[];
  loading:      boolean;
  error:        string | null;
  refresh:      () => Promise<void>;
  spend:        (amount: number, reason: string, referenceId?: string) => Promise<void>;
};

export function useUserCredits(): UseUserCreditsReturn {
  const { isAuthenticated } = useAuth();

  const [balance,      setBalance]      = useState<number | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const data = await userApi.getCredits();
      setBalance(data.balance);
      setTransactions(data.transactions ?? []);
    } catch {
      setError('Could not load credits');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const spend = useCallback(async (amount: number, reason: string, referenceId?: string) => {
    await userApi.spendCredits({ amount, reason, referenceId });
    await refresh();
  }, [refresh]);

  useEffect(() => {
    if (!isAuthenticated) {
      setBalance(null);
      setTransactions([]);
      setError(null);
      return;
    }
    refresh();
  }, [isAuthenticated, refresh]);

  return { balance, transactions, loading, error, refresh, spend };
}
