import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface UseTutorDashboardReturn {
  user: any;
  stats: any;
  sessions: any[];
  performance: any;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTutorDashboard(): UseTutorDashboardReturn {
  const [data, setData] = useState<{
    user: any;
    stats: any;
    sessions: any[];
    performance: any;
    isLoading: boolean;
    error: string | null;
  }>({
    user: null,
    stats: null,
    sessions: [],
    performance: null,
    isLoading: true,
    error: null,
  });

  const router = useRouter();

  const fetchDashboard = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true, error: null }));

      const token = localStorage.getItem('auth_token');
      if (!token) {
        router.push('/signin');
        return;
      }

      const response = await fetch('/api/tutor/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        router.push('/signin');
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard: ${response.status}`);
      }

      const result = await response.json();
      
      setData({
        user: result.user || null,
        stats: result.stats || null,
        sessions: result.sessions || [],
        performance: result.performance || null,
        isLoading: false,
        error: null,
      });

    } catch (err) {
      console.error('Dashboard fetch error:', err);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load dashboard'
      }));
    }
  }, [router]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    user: data.user,
    stats: data.stats,
    sessions: data.sessions,
    performance: data.performance,
    isLoading: data.isLoading,
    error: data.error,
    refetch: fetchDashboard,
  };
}