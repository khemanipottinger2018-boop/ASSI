'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
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
   SINGLETON SOCKET
   Persists across re-renders; created once per session.
───────────────────────────────────────────── */

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL ?? '/', {
      withCredentials: true,                         // FIX: sends session cookie for auth
      transports: ['websocket', 'polling'],          // FIX: polling fallback required by handover
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

/* ─────────────────────────────────────────────
   PROVIDER
───────────────────────────────────────────── */

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [presence, setPresence] = useState<FullPresence | null>(null);
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTabVisible = useRef(true);

  /* ─── Fetch presence from server ─── */
  const fetchPresence = useCallback(async () => {
    try {
      const data = await presenceApi.getMe();
      setPresence(data.presence);
      setEligibility(data.eligibility);
    } catch (err: any) {
      // api client throws on non-2xx — check message for 401
      if (err?.message?.includes('401')) {
        window.location.href = '/login';
        return;
      }
      console.error('[PresenceProvider] fetchPresence error', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ─── Heartbeat ─── */
  const fireHeartbeat = useCallback(async () => {
    try {
      await presenceApi.heartbeat();
    } catch (err: any) {
      if (err?.message?.includes('401')) {
        window.location.href = '/login';
      } else {
        console.warn('[PresenceProvider] heartbeat error', err);
      }
    }
  }, []);

  const startHeartbeat = useCallback(() => {
    if (heartbeatRef.current) return; // already running
    heartbeatRef.current = setInterval(fireHeartbeat, 60_000); // FIX: 60s, not 45s
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
        setPresence(data.presence);
        setEligibility(data.eligibility);
      } catch (err) {
        console.error('[PresenceProvider] setIntent error', err);
      }
    },
    []
  );

  /* ─── Socket setup ─── */
  useEffect(() => {
    const sock = getSocket();

    const onConnect = async () => {
      // FIX: always re-fetch on (re)connect — socket reconnect resets server state
      await fetchPresence();

      setPresence((prev) =>
        prev ? { ...prev, socketConnected: true } : prev
      );
    };

    const onDisconnect = () => {
      // Optimistically mark socket as disconnected while server catches up
      setPresence((prev) =>
        prev ? { ...prev, socketConnected: false } : prev
      );
    };

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
    };
  }, [fetchPresence]);

  /* ─── Tab visibility ─── */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // FIX: tab hidden → pause heartbeat
        isTabVisible.current = false;
        stopHeartbeat();
      } else {
        // FIX: tab visible → fire immediate beat, then resume interval
        isTabVisible.current = true;
        fireHeartbeat();
        startHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fireHeartbeat, startHeartbeat, stopHeartbeat]);

  /* ─── Mount: initial fetch + heartbeat ─── */
  useEffect(() => {
    fetchPresence();
    startHeartbeat();

    return () => {
      stopHeartbeat();
      // Note: we intentionally do NOT disconnect the socket here.
      // The singleton persists for the session lifetime.
      // If you want full teardown (e.g. on logout), call socket.disconnect() explicitly.
    };
  }, [fetchPresence, startHeartbeat, stopHeartbeat]);

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
