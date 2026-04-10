'use client';

/**
 * useLiveSession
 *
 * Central hook for live session state. Views should call this instead of
 * calling useSessionEvents() + a manual fetch separately.
 *
 * Contract:
 *  1. On mount — fetches /api/live-chat/${sessionId} to seed store state
 *     from the backend before the socket connects. The frontend never
 *     infers session status locally; everything comes from the API or socket.
 *  2. Socket events — delegates to useSessionEvents(), which writes all
 *     lifecycle transitions to useSessionStore.
 *  3. Return values — derived from the store, never from local timers.
 *     remainingMs and graceRemainingMs are computed as (epoch - Date.now())
 *     at render time, so they are always fresh and never drift.
 *
 * The component is responsible for triggering re-renders (e.g., via its
 * own tick state) when it needs live countdown display.
 */

import { useEffect, useState }  from 'react';
import { useSessionEvents }      from './useSessionEvents';
import { useSessionStore }       from '../store/useSessionStore';
import type { StoreSessionStatus } from '../store/useSessionStore';
import type { Participant }       from '../types/SocketEvents';
import { api }                   from '@/lib/api';

type LiveSessionApiResponse = {
  success: boolean;
  session?: {
    status:          string;
    endedReason?:    string;
    endsAt?:         number;
    graceExpiresAt?: number;
    participants?:   Participant[];
  } | null;
};

export function useLiveSession(sessionId: string) {
  const [hydrating, setHydrating] = useState(true);

  const {
    status,
    endReason,
    endsAt,
    graceExpiresAt,
    participants,
    systemMessages,
    setStatus,
    setEndReason,
    setEndsAt,
    setGraceExpiresAt,
    setParticipants,
    reset,
  } = useSessionStore();

  // Session-aware reset: only wipes state when the sessionId changes, not
  // on same-session re-renders (e.g. React Strict Mode double-mount).
  useEffect(() => {
    reset(sessionId);
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount: fetch backend-authoritative session state and seed the store.
  // This runs before the socket connects so the UI shows the correct initial
  // state on page load / hard refresh — never assumes persistence from memory.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;

    api.get<LiveSessionApiResponse>(`/api/live-chat/${sessionId}`)
      .then(d => {
        if (cancelled || !d.success || !d.session) return;
        const { status: s, endedReason, endsAt: ea, graceExpiresAt: gea, participants: ps } = d.session;

        // Let the backend status drive the store — no local inference.
        const mapped = s as StoreSessionStatus;
        if (mapped === 'ended') {
          setEndReason(endedReason ?? '');
        }
        setStatus(mapped);
        if (ea  != null) setEndsAt(ea);
        if (gea != null) setGraceExpiresAt(gea);
        if (ps  != null) setParticipants(ps);
      })
      .catch(() => {
        // Non-fatal: socket events will reconcile state once connected.
      })
      .finally(() => { if (!cancelled) setHydrating(false); });

    return () => { cancelled = true; };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // All socket-driven session lifecycle transitions
  useSessionEvents(sessionId);

  return {
    hydrating,
    status,
    endReason,
    endsAt,
    graceExpiresAt,
    participants,
    systemMessages,
  };
}
