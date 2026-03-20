'use client';

/**
 * useTutorAvailability
 *
 * Single source of truth for tutor availability state.
 * Both TutorDashboard and TutorHomeSelector use this hook —
 * if the toggle doesn't work here, it won't work anywhere.
 *
 * available = Redis says online AND socket is connected
 * If socket is offline, tutor can't receive requests even if
 * Redis intent is 'available' — so we reflect that here.
 */

import { useState, useEffect, useCallback } from 'react';
import { usePresence } from '@/hooks/usePresence';
import { useSocket }   from '@/hooks/useSocket';

export function useTutorAvailability() {
  const { status, setStatus, hydrated, discoverable } = usePresence();
  const { isConnected, subscribe }                     = useSocket();

  const [toggling,         setToggling]         = useState(false);
  const [showSocketStatus, setShowSocketStatus] = useState(false);

  // Wait 2s before showing socket status — avoids misleading flash on refresh
  useEffect(() => {
    const t = setTimeout(() => setShowSocketStatus(true), 2000);
    return () => clearTimeout(t);
  }, []);

  // available = Redis online + socket connected
  // If socket is down, we're not truly discoverable regardless of Redis intent
  const available = status === 'online' && isConnected;
  const busy      = status === 'busy';

  const toggle = useCallback(async () => {
    if (toggling || busy || !hydrated) return;
    setToggling(true);
    try {
      await setStatus(status === 'online' ? 'offline' : 'online');
    } finally {
      setToggling(false);
    }
  }, [toggling, busy, hydrated, status, setStatus]);

  return {
    // State
    status,          // raw Redis status: 'online' | 'offline' | 'busy'
    available,       // true only when Redis=online AND socket connected
    busy,            // true when in a session
    hydrated,        // true once presence loaded from Redis
    discoverable,    // true when Redis says discoverable
    isConnected,     // live socket connection state

    // Socket status display — delayed to avoid misleading flash
    showSocketStatus,
    socketLabel: isConnected
      ? discoverable ? 'Discoverable' : 'Connected'
      : 'Socket offline',

    // Actions
    toggle,          // call this to toggle online/offline
    toggling,        // true while toggle is in flight
    subscribe,       // pass through for queue listeners
  };
}