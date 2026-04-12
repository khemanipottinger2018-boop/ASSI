'use client';

import { useEffect, useRef } from 'react';
import { AuthUser } from '@/features/auth';

const API_URL       = process.env.NEXT_PUBLIC_API_URL!;
const PING_KEY      = 'assi:streak_last_ping'; // localStorage key
const PING_INTERVAL = 60 * 60 * 1000;         // re-ping after 1 h in same tab

/**
 * Pings /api/user/streak/ping once per calendar day (per browser) while the
 * user is authenticated.  A lightweight localStorage guard prevents hammering
 * the endpoint when the user is actively navigating between pages.
 *
 * The backend is idempotent for the same calendar day so even if multiple tabs
 * fire, only the first one counts.
 */
export function useActivityStreak(user: AuthUser | null) {
  const pinggedRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (pinggedRef.current) return;

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    try {
      const stored = localStorage.getItem(PING_KEY);
      if (stored) {
        const { date, ts } = JSON.parse(stored) as { date: string; ts: number };
        // Already pinged today and within the throttle window — skip.
        if (date === today && Date.now() - ts < PING_INTERVAL) return;
      }
    } catch {
      // Corrupt storage — just proceed.
    }

    pinggedRef.current = true;

    fetch(`${API_URL}/api/user/streak/ping`, {
      method:      'POST',
      credentials: 'include',
    })
      .then(() => {
        localStorage.setItem(PING_KEY, JSON.stringify({ date: today, ts: Date.now() }));
      })
      .catch(err => console.error('[useActivityStreak] ping error:', err));

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
