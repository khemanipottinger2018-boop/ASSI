'use client';

/**
 * useActiveSession
 *
 * Returns the student's active live session ID if one exists in Redis,
 * or null if they have none.
 *
 * Used by nav/sidebar to show an "Ongoing Session →" badge.
 *
 * Backend: GET /api/live-chat/active
 * Response: { success, session: { sessionId, status, tutorName, subjectName, startedAt } | null }
 *
 * Student role only. Polls every 15s.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { sessionsApi } from '@/lib/api';

const POLL_MS = 15_000;

export function useActiveSession(): string | null {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = async () => {
    if (!user || user.role !== 'student') return;

    try {
      const data = await sessionsApi.getActiveSession();
      setSessionId(data.session?.sessionId ?? null);
    } catch {
      // silent — badge just won't show
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'student') {
      setSessionId(null);
      return;
    }

    check();
    intervalRef.current = setInterval(check, POLL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  return sessionId;
}