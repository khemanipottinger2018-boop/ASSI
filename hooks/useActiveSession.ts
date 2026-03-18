/**
 * useActiveSession
 *
 * Returns the student's current active session ID if one exists in Redis,
 * or null if they have no active session.
 *
 * Used by the nav/sidebar to show an "Ongoing Session →" badge so the
 * student can always get back to their session from any page.
 *
 * Backend endpoint expected:
 *   GET /api/live-chat/active
 *   → { success: true,  sessionId: string }   (active session exists)
 *   → { success: true,  sessionId: null }      (no active session)
 *   → { success: false, error: string }        (unauthenticated / error)
 *
 * Only runs for authenticated users with role 'student'.
 * Polls every 15s so the badge disappears promptly when a session ends.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL     = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const POLL_MS     = 15_000;

export function useActiveSession(): string | null {
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const check = () => {
    if (!user || user.role !== 'student') return;

    fetch(`${API_URL}/api/live-chat/active`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) setSessionId(d.sessionId ?? null);
      })
      .catch(() => {});
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
  }, [user]);

  return sessionId;
}
