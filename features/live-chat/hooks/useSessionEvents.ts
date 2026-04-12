'use client';

/**
 * useSessionEvents
 *
 * Centralized socket listener for session lifecycle transitions.
 * Mount ONCE per view (via useLiveSession) — do NOT bind these events
 * locally in view components. This hook owns all session lifecycle bindings.
 *
 * Writes to useSessionStore so all view components see the same state
 * without duplicate .on() registrations.
 *
 * session:started    → status 'active'
 * session:paused     → status 'paused'
 * session:ended      → status 'ended' + endReason  (filtered by sessionId)
 * session:host_left  → status 'host_left_grace' + graceExpiresAt
 * session:resumed    → status 'active' + clears graceExpiresAt
 * session:updated    → merges partial SessionMeta into store (never overwrites)
 * chat:system_message → appends to systemMessages in store
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
  const setStatus            = useSessionStore(s => s.setStatus);
  const setEndReason         = useSessionStore(s => s.setEndReason);
  const setGraceExpiresAt    = useSessionStore(s => s.setGraceExpiresAt);
  const setEndsAt            = useSessionStore(s => s.setEndsAt);
  const setCanExtend         = useSessionStore(s => s.setCanExtend);
  const appendSystemMessage  = useSessionStore(s => s.appendSystemMessage);
  const mergeMeta            = useSessionStore(s => s.mergeMeta);

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

    // session:ended — filter by sessionId to avoid cross-session pollution
    const onEnded = ({ sessionId: sid, reason }: { sessionId: string; reason: string }) => {
      if (sid && sid !== sessionId) return;
      setEndReason(reason);
      setStatus('ended');
    };

    // session:host_left — enter grace period; graceExpiresAt is authoritative
    const onHostLeft = ({ sessionId: sid, graceExpiresAt }: { sessionId: string; graceExpiresAt: number }) => {
      if (sid !== sessionId) return;
      setGraceExpiresAt(graceExpiresAt);
      setStatus('host_left_grace');
    };

    // session:resumed — host returned; clear grace and go back to active
    const onResumed = ({ sessionId: sid }: { sessionId: string }) => {
      if (sid !== sessionId) return;
      setGraceExpiresAt(null);
      setStatus('active');
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

    // session:extended — backend confirms the one-time +15 min extension.
    // Updates endsAt so the timer resets and marks canExtend false so the
    // prompt never shows again.
    const onExtended = ({ sessionId: sid, endsAt, canExtend }: { sessionId: string; endsAt: number; canExtend: boolean }) => {
      if (sid !== sessionId) return;
      setEndsAt(endsAt);
      setCanExtend(canExtend);
    };

    // chat:system_message — backend-generated notifications (e.g. "host has left")
    const onSystemMessage = ({ sessionId: sid, content, timestamp }: { sessionId: string; content: string; timestamp: number }) => {
      if (sid !== sessionId) return;
      appendSystemMessage({ content, timestamp });
    };

    on('session:started',      onStarted);
    on('session:paused',       onPaused);
    on('session:ended',        onEnded);
    on('session:host_left',    onHostLeft);
    on('session:resumed',      onResumed);
    on('session:updated',      onUpdated);
    on('session:meta',         onMeta);
    on('session:extended',     onExtended);
    on('chat:system_message',  onSystemMessage);

    return () => {
      off('session:started',     onStarted);
      off('session:paused',      onPaused);
      off('session:ended',       onEnded);
      off('session:host_left',   onHostLeft);
      off('session:resumed',     onResumed);
      off('session:updated',     onUpdated);
      off('session:meta',        onMeta);
      off('session:extended',    onExtended);
      off('chat:system_message', onSystemMessage);
    };
  }, [sessionId, isConnected, on, off, setStatus, setEndReason, setGraceExpiresAt, setEndsAt, setCanExtend, appendSystemMessage, mergeMeta]);
}
