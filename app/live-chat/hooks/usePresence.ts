'use client';

import { useEffect, useState, useRef } from 'react';

export type PresenceStatus = 'online' | 'idle' | 'offline';

type UsePresenceOptions = {
  userId: string | null;
  pollIntervalMs?: number;
};

export function usePresence({
  userId,
  pollIntervalMs = 15_000, // 15s (matches backend thresholds)
}: UsePresenceOptions) {
  const [status, setStatus] = useState<PresenceStatus>('offline');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!userId) {
      setStatus('offline');
      return;
    }

    const fetchPresence = async () => {
      try {
        const res = await fetch(`/api/presence/${userId}`, {
          credentials: 'include',
        });

        if (!res.ok) return;

        const data = await res.json();
        if (data?.status) {
          setStatus(data.status as PresenceStatus);
        }
      } catch {
        // fail silently; presence is non-critical
      }
    };

    // Initial fetch
    fetchPresence();

    // Poll
    intervalRef.current = setInterval(fetchPresence, pollIntervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [userId, pollIntervalMs]);

  return {
    status,
    isOnline: status === 'online',
    isIdle: status === 'idle',
    isOffline: status === 'offline',
  };
}
