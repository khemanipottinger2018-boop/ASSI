'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useSocketContext } from '@/features/socket';
import { presenceApi } from './presenceApi';

/* ─────────────────────────────────────────────
   TYPES
───────────────────────────────────────────── */

export type StatusIntent =
  | 'available'
  | 'do_not_disturb'
  | 'busy_session'   // read-only — set by server only
  | 'busy_other';

export type EligibilityReason =
  | 'ok'
  | 'offline'
  | 'reconnecting'
  | 'busy_session'
  | 'busy_other'
  | 'not_available';

export interface FullPresence {
  online: boolean;
  socketConnected: boolean;
  intent: StatusIntent;
  lastActivity: number | null;
  socketCount: number;
}

export interface Eligibility {
  eligible: boolean;
  reason: EligibilityReason;
}

export interface PresenceContextValue {
  presence: FullPresence | null;
  eligibility: Eligibility | null;
  setIntent: (intent: Exclude<StatusIntent, 'busy_session'>) => Promise<void>;
  isLoading: boolean;
  refreshPresence: () => Promise<void>;
}

/* ─────────────────────────────────────────────
   CONTEXT
───────────────────────────────────────────── */

const PresenceContext = createContext<PresenceContextValue | undefined>(undefined);

/* ─────────────────────────────────────────────
   PROVIDER
   Reuses the auth-gated socket from SocketContext
   instead of creating its own connection.
───────────────────────────────────────────── */

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, subscribe, emit } = useSocketContext();

  const [presence, setPresence]     = useState<FullPresence | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [isLoading, setIsLoading]   = useState(true);

  const heartbeatRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryRef        = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTabVisible    = useRef(true);
  // Track previous connection state to detect transitions
  const wasConnected    = useRef(false);
  // Generation counter — incremented on every fetchPresence call so out-of-order
  // responses (e.g. socket-connect fetch racing with heartbeat-chain fetch) are discarded.
  const fetchGenRef     = useRef(0);
  // Mirrors presence.intent so fireHeartbeat can send it without closing over stale state.
  const currentIntentRef = useRef<StatusIntent>('do_not_disturb');

  /* ─── Fetch presence from server ─── */
  const fetchPresence = useCallback(async () => {
    const gen = ++fetchGenRef.current;
    try {
      const data = await presenceApi.getMe();
      // Discard if a newer fetch already resolved — prevents a slow in-flight
      // request (e.g. socket-connect fetch sent before Redis had the key) from
      // overwriting a fresher response and leaving the tutor stuck as "Offline".
      if (gen !== fetchGenRef.current) return;
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
      currentIntentRef.current = data.presence.intent;
      setPresence(data.presence);
      setEligibility(data.eligibility);
    } catch (err: any) {
      if (gen !== fetchGenRef.current) return;
      if (err?.message?.includes('401')) {
        window.location.href = '/signin';
        return;
      }
      console.error('[PresenceProvider] fetchPresence error', err);
      // Single retry after 3s — prevents permanent "Offline" on transient failures.
      // Guard with ref so concurrent failures don't stack multiple retries.
      if (!retryRef.current) {
        retryRef.current = setTimeout(() => {
          retryRef.current = null;
          fetchPresence();
        }, 3_000);
      }
    } finally {
      if (gen === fetchGenRef.current) setIsLoading(false);
    }
  }, []);

  /* ─── Heartbeat ─── */
  const fireHeartbeat = useCallback(async () => {
    try {
      await presenceApi.heartbeat(currentIntentRef.current);
    } catch (err: any) {
      if (err?.message?.includes('401')) {
        window.location.href = '/signin';
      } else {
        console.warn('[PresenceProvider] heartbeat error', err);
      }
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return;
    heartbeatRef.current = setInterval(fireHeartbeat, 60_000);
  }, [fireHeartbeat]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  /* ─── Intent update ─── */
  const setIntent = useCallback(
    async (intent: Exclude<StatusIntent, 'busy_session'>) => {
      try {
        const data = await presenceApi.setIntent(intent);
        currentIntentRef.current = data.presence.intent;
        setPresence(data.presence);
        setEligibility(data.eligibility);
      } catch (err) {
        console.error('[PresenceProvider] setIntent error', err);
      }
    },
    []
  );

  /* ─── React to socket connect/disconnect via SocketContext ─── */
  useEffect(() => {
    const connected = isConnected;

    if (connected && !wasConnected.current) {
      // Transition: disconnected → connected.
      // Only fetch if we have no presence data yet (i.e. mount fetch hasn't
      // resolved). If data already exists this is a reconnect — rely on the
      // server-pushed presence:update event instead of racing a redundant fetch.
      if (!presence) fetchPresence();
    }

    if (!connected && wasConnected.current) {
      // Transition: connected → disconnected
      // Optimistically mark socket as disconnected
      setPresence((prev) =>
        prev ? { ...prev, socketConnected: false } : prev
      );
    }

    wasConnected.current = connected;
  }, [isConnected, presence, fetchPresence]);

  /* ─── Listen for server-pushed presence updates ─── */
  useEffect(() => {
    const unsub = subscribe('presence:update', (data: { presence: FullPresence; eligibility: Eligibility }) => {
      const p = data.presence;
      const e = data.eligibility;
      currentIntentRef.current = p.intent;
      // Return prev reference unchanged when nothing changed — prevents
      // downstream re-renders on repeated heartbeat pushes.
      setPresence(prev =>
        prev &&
        prev.online === p.online &&
        prev.socketConnected === p.socketConnected &&
        prev.intent === p.intent &&
        prev.lastActivity === p.lastActivity &&
        prev.socketCount === p.socketCount
          ? prev : p
      );
      setEligibility(prev =>
        prev && e &&
        prev.eligible === e.eligible &&
        prev.reason === e.reason
          ? prev : (e ?? null)
      );
    });
    return unsub;
  }, [subscribe]);

  /* ─── Tab visibility ─── */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabVisible.current = false;
        stopHeartbeat();
        emit('presence:page_hidden');
      } else {
        isTabVisible.current = true;
        emit('presence:page_visible');
        fireHeartbeat();
        startHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [emit, fireHeartbeat, startHeartbeat, stopHeartbeat]);

  /* ─── Mount: initial fetch + heartbeat ─── */
  useEffect(() => {
    // Fire heartbeat immediately so the Redis presence key exists before we fetch.
    // Without this, fetchPresence() returns online:false on first load because
    // the scheduled heartbeat interval doesn't fire for 60s.
    fireHeartbeat().then(() => fetchPresence());
    startHeartbeat();

    return () => {
      stopHeartbeat();
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
    };
  }, [fetchPresence, fireHeartbeat, startHeartbeat, stopHeartbeat]);

  return (
    <PresenceContext.Provider
      value={{
        presence,
        eligibility,
        setIntent,
        isLoading,
        refreshPresence: fetchPresence,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

/* ─────────────────────────────────────────────
   HOOK
───────────────────────────────────────────── */

export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) throw new Error('usePresence must be used within a PresenceProvider');
  return context;
}
