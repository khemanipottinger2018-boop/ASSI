'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
const INTERVAL_MS = 45_000;

export type PresenceStatus = 'online' | 'offline' | 'busy';
export type StatusIntent =
  | 'available'
  | 'do_not_disturb'
  | 'busy_session'
  | 'busy_other';

export type PresenceContextValue = {
  status: PresenceStatus;
  intent: StatusIntent | null;
  isOnline: boolean;
  isBusy: boolean;
  hydrated: boolean;
  socketConnected: boolean;
  discoverable: boolean;
  setStatus: (next: PresenceStatus) => Promise<void>;
  setIntent: (next: StatusIntent) => Promise<void>;
  refreshPresence: () => Promise<void>;
};

const PresenceContext = createContext<PresenceContextValue | null>(null);

function deriveStatus(
  online: boolean,
  intent: StatusIntent | null
): PresenceStatus {
  if (!online || !intent || intent === 'do_not_disturb') return 'offline';
  if (intent === 'busy_session' || intent === 'busy_other') return 'busy';
  return 'online';
}

function statusToIntent(status: PresenceStatus): StatusIntent {
  if (status === 'online') return 'available';
  if (status === 'busy') return 'busy_other';
  return 'do_not_disturb';
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [intent, setIntentState] = useState<StatusIntent | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [discoverable, setDiscoverable] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aliveRef = useRef(true);
  const intentRef = useRef<StatusIntent | null>(null);

  useEffect(() => {
    intentRef.current = intent;
  }, [intent]);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const resetPresence = useCallback(() => {
    setIntentState(null);
    setIsOnline(false);
    setHydrated(false);
    setSocketConnected(false);
    setDiscoverable(false);
  }, []);

  const applyPresencePayload = useCallback((data: any) => {
    setIsOnline(Boolean(data?.online));
    setIntentState(data?.intent ?? null);
    setSocketConnected(Boolean(data?.socketConnected));
    setDiscoverable(Boolean(data?.discoverable));
    setHydrated(true);
  }, []);

  const refreshPresence = useCallback(async () => {
    if (!user) return;

    try {
      const res = await fetch(`${API_URL}/api/presence/me`, {
        credentials: 'include',
      });

      if (!res.ok) {
        if (!aliveRef.current) return;
        setIntentState(null);
        setIsOnline(false);
        setSocketConnected(false);
        setDiscoverable(false);
        setHydrated(true);
        return;
      }

      const data = await res.json();

      if (!aliveRef.current) return;

      if (!data?.success) {
        setIntentState(null);
        setIsOnline(false);
        setSocketConnected(false);
        setDiscoverable(false);
        setHydrated(true);
        return;
      }

      applyPresencePayload(data);
    } catch {
      if (!aliveRef.current) return;
      setIntentState(null);
      setIsOnline(false);
      setSocketConnected(false);
      setDiscoverable(false);
      setHydrated(true);
    }
  }, [user, applyPresencePayload]);

  const heartbeat = useCallback(async () => {
    if (!user || !hydrated || !intentRef.current) return;

    try {
      await fetch(`${API_URL}/api/presence/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ intent: intentRef.current }),
      });
    } catch {
      // silent
    }
  }, [user, hydrated]);

  useEffect(() => {
    if (!user) {
      resetPresence();
      return;
    }

    refreshPresence();
  }, [user, refreshPresence, resetPresence]);

  useEffect(() => {
    if (!user || !hydrated) return;

    intervalRef.current = setInterval(() => {
      heartbeat();
    }, INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user, hydrated, heartbeat]);

  const setIntent = useCallback(async (next: StatusIntent) => {
    try {
      const res = await fetch(`${API_URL}/api/presence/intent`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ intent: next }),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (!aliveRef.current || !data?.success) return;

      setIntentState(data.intent ?? next);
      setIsOnline(Boolean(data.online));

      if (typeof data.socketConnected === 'boolean') {
        setSocketConnected(data.socketConnected);
      }

      if (typeof data.discoverable === 'boolean') {
        setDiscoverable(data.discoverable);
      }
    } catch {
      // silent
    }
  }, []);

  const setStatus = useCallback(
    async (next: PresenceStatus) => {
      await setIntent(statusToIntent(next));
    },
    [setIntent]
  );

  const value = useMemo<PresenceContextValue>(
    () => ({
      status: deriveStatus(isOnline, intent),
      intent,
      isOnline,
      isBusy: deriveStatus(isOnline, intent) === 'busy',
      hydrated,
      socketConnected,
      discoverable,
      setStatus,
      setIntent,
      refreshPresence,
    }),
    [
      intent,
      isOnline,
      hydrated,
      socketConnected,
      discoverable,
      setStatus,
      setIntent,
      refreshPresence,
    ]
  );

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresenceContext() {
  const ctx = useContext(PresenceContext);
  if (!ctx) {
    throw new Error('usePresenceContext must be used within PresenceProvider');
  }
  return ctx;
}