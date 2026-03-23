'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/* ───────── TYPES ───────── */

export type PresenceStatus = 'online' | 'offline' | 'busy';

export interface FullPresence {
  online: boolean;
  socketConnected: boolean;
  intent: 'available' | 'do_not_disturb' | 'busy_session' | 'busy_other';
  discoverable: boolean;
  lastActivity: number | null;
  socketCount: number;
}

export type PresenceData = {
  hydrated: boolean;
  status: PresenceStatus;
  discoverable: boolean;
  isOnline: boolean;
  socketConnected: boolean;

  // tutor-specific
  tutorAvailable?: boolean;
  tutorBusy?: boolean;
};

type PresenceContextValue = PresenceData & {
  refreshPresence: () => Promise<void>;
  setTutorAvailable?: (value: boolean) => void; // tutor toggle method
};

/* ───────── CONTEXT ───────── */

const PresenceContext = createContext<PresenceContextValue | undefined>(undefined);

/* ───────── SINGLETON SOCKET ───────── */

let socket: Socket | null = null;

/* ───────── PROVIDER ───────── */

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<PresenceStatus>('offline');
  const [discoverable, setDiscoverable] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  // tutor-specific
  const [tutorAvailable, setTutorAvailableState] = useState<boolean>(false);
  const tutorBusy = status === 'busy';

  /* ───────── MAP BACKEND INTENT ───────── */
  function mapIntentToStatus(intent: FullPresence['intent']): PresenceStatus {
    if (intent === 'busy_session' || intent === 'busy_other') return 'busy';
    if (intent === 'available') return 'online';
    return 'offline';
  }

  /* ───────── FETCH PRESENCE ───────── */
  async function fetchPresence() {
    try {
      const res = await fetch('/api/presence/me');
      if (!res.ok) throw new Error('Failed to fetch presence');
      const data: FullPresence = await res.json();

      setStatus(mapIntentToStatus(data.intent));
      setDiscoverable(data.discoverable);
      setIsOnline(data.online);
      setSocketConnected(data.socketConnected);
      setHydrated(true);
    } catch (err) {
      console.error('[PresenceProvider] fetchPresence error', err);
    }
  }

  /* ───────── SOCKET CONNECTION ───────── */
  function connectSocket() {
    if (socket) return;

    socket = io('/', {
      autoConnect: true,
      reconnection: true,
      transports: ['websocket'],
    });

    socket.on('connect', () => setSocketConnected(true));
    socket.on('disconnect', () => setSocketConnected(false));

    // Listen for live presence updates
    socket.on('presenceUpdate', (data: FullPresence) => {
      setStatus(mapIntentToStatus(data.intent));
      setDiscoverable(data.discoverable);
      setIsOnline(data.online);
      setSocketConnected(data.socketConnected);
    });
  }

  /* ───────── EFFECT ───────── */
  useEffect(() => {
    fetchPresence();
    connectSocket();

    const heartbeatInterval = setInterval(() => {
      fetch('/api/presence/heartbeat', { method: 'POST' }).catch((err) =>
        console.warn('[PresenceProvider] heartbeat error', err)
      );
    }, 45_000);

    return () => {
      clearInterval(heartbeatInterval);
      socket?.disconnect();
    };
  }, []);

  const setTutorAvailable = (value: boolean) => {
    // only allow if online and socket connected
    if (!isOnline || !socketConnected || tutorBusy) return;
    setTutorAvailableState(value);
  };

  return (
    <PresenceContext.Provider
      value={{
        hydrated,
        status,
        discoverable,
        isOnline,
        socketConnected,
        tutorAvailable,
        tutorBusy,
        setTutorAvailable,
        refreshPresence: fetchPresence,
      }}
    >
      {children}
    </PresenceContext.Provider>
  );
}

/* ───────── HOOK ───────── */
export function usePresence() {
  const context = useContext(PresenceContext);
  if (!context) throw new Error('usePresence must be used within PresenceProvider');
  return context;
}