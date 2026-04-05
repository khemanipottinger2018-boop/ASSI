'use client';

/**
 * useSessionEvents
 *
 * Centralized socket listener for session lifecycle transitions.
 * Mount ONCE per view — do NOT also bind session:started / session:paused /
 * session:ended locally in the view. This hook owns those bindings.
 *
 * Writes to useSessionStore so all view components see the same state
 * without duplicate .on() registrations.
 *
 * session:started  → status 'active'   (covers both first-start and resume-from-pause)
 * session:paused   → status 'paused'
 * session:ended    → status 'ended'  + endReason
 * session:updated  → merges partial SessionMeta into store (never overwrites)
 *
 * All transitions are idempotent — setStatus in useSessionStore skips
 * the update when the incoming value matches the current value.
 */

import { useEffect } from 'react';
import { useChatSocket }   from './useChatSocket';
import { useSessionStore } from '../store/useSessionStore';
import type { SessionMeta } from '../types/SocketEvents';

export function useSessionEvents(sessionId: string) {
  const { on, off, isConnected, socket } = useChatSocket();
  const setStatus    = useSessionStore(s => s.setStatus);
  const setEndReason = useSessionStore(s => s.setEndReason);
  const mergeMeta    = useSessionStore(s => s.mergeMeta);

  // Dev-only: log every socket event for debugging.
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    if (!socket) return;
    const logAll = (event: string, ...args: unknown[]) => {
      console.debug('[socket:event]', event, args);
    };
    socket.onAny(logAll);
    return () => { socket.offAny(logAll); };
  }, [socket]);

  useEffect(() => {
    if (!isConnected || !sessionId) return;

    const onStarted = ({ sessionId: sid }: { sessionId: string }) => {
      if (sid !== sessionId) return;
      // Idempotent via store — no-ops if already 'active'
      setStatus('active');
    };

    // session:paused carries a reason but we only need to update status
    const onPaused = (_p: { reason: string }) => setStatus('paused');

    const onEnded = ({ reason }: { reason: string }) => {
      setEndReason(reason);
      setStatus('ended');
    };

    // session:updated — merge partial meta; safe regardless of event order
    const onUpdated = (meta: Partial<SessionMeta> & { sessionId: string }) => {
      if (meta.sessionId !== sessionId) return;
      mergeMeta(meta);
    };

    // session:meta — full meta snapshot from backend; merge into store
    const onMeta = (meta: SessionMeta) => {
      if (meta.sessionId !== sessionId) return;
      mergeMeta(meta);
    };

    on('session:started', onStarted);
    on('session:paused',  onPaused);
    on('session:ended',   onEnded);
    on('session:updated', onUpdated);
    on('session:meta',    onMeta);

    return () => {
      off('session:started', onStarted);
      off('session:paused',  onPaused);
      off('session:ended',   onEnded);
      off('session:updated', onUpdated);
      off('session:meta',    onMeta);
    };
  }, [sessionId, isConnected, on, off, setStatus, setEndReason, mergeMeta]);
}
