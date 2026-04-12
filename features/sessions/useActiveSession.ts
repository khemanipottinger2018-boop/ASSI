'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth';
import { useSocketContext } from '@/features/socket';
import { sessionsApi } from '@/features/sessions';
import type { SessionStatus } from '@/lib/api/browse';

const POLL_MS = 15_000;

interface ActiveSessionResponse {
  session: {
    sessionId: string;
    status: SessionStatus;
    partnerName: string;
    subjectName: string;
    startedAt: string | null;
  } | null;
}

// All statuses the server returns from GET /active when a session is genuinely
// ongoing. 'host_left_grace' is only tracked in Redis, so it now surfaces here
// after the backend Redis-override fix in live-chat.route.ts.
const isActiveSession = (status: SessionStatus) =>
  status === 'active' || status === 'paused' || (status as string) === 'host_left_grace';

export function useActiveSession(): string | null {
  const { user } = useAuth();
  const { subscribe, isConnected } = useSocketContext();

  const [sessionId, setSessionId] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const invalidatedRef = useRef<Set<string>>(new Set());

  const check = async () => {
    if (!user) return;

    try {
      const data: ActiveSessionResponse =
        await sessionsApi.getActiveSession();

      const session = data.session;

      if (!session) {
        setSessionId(null);
        return;
      }

      if (invalidatedRef.current.has(session.sessionId)) {
        return;
      }

      if (!isActiveSession(session.status)) {
        setSessionId(null);
        return;
      }

      setSessionId(session.sessionId);
    } catch {
      // silent fail
    }
  };

  useEffect(() => {
    if (!user) {
      setSessionId(null);
      return;
    }

    check();
    intervalRef.current = setInterval(check, POLL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;

    return subscribe('session:ended', (payload: { sessionId?: string }) => {
      if (!payload.sessionId) {
        setSessionId(null);
        return;
      }

      invalidatedRef.current.add(payload.sessionId);

      setSessionId(prev =>
        prev === payload.sessionId ? null : prev
      );
    });
  }, [user?.id, subscribe, isConnected]);

  useEffect(() => {
    if (!user) return;

    return subscribe('session:update', (session: {
      sessionId: string;
      status: SessionStatus;
    }) => {
      if (session.status === 'ended' || session.status === 'cancelled') {
        invalidatedRef.current.add(session.sessionId);
        setSessionId(null);
        return;
      }

      if (isActiveSession(session.status)) {
        setSessionId(session.sessionId);
        return;
      }

      setSessionId(null);
    });
  }, [user?.id, subscribe]);

  return sessionId;
}