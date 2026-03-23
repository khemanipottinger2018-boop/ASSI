'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatSocket } from './useChatSocket';

interface Presence {
  participants: string[];
  count:        number;
}

export function useChatRoom(sessionId: string) {
  const { emit, on, off, isConnected } = useChatSocket();
  const joinedRef = useRef(false);
  const [presence, setPresence] = useState<Presence>({ participants: [], count: 0 });

  /* ── Join / leave ────────────────────────────────────────────
     Kept separate from the listener so sessionId changes don't
     cause a missed join due to React 18 strict mode cleanup order.
  ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isConnected || !sessionId) return;
    if (joinedRef.current) return;

    joinedRef.current = true;
    emit('chat:join', sessionId);

    return () => {
      joinedRef.current = false;
      emit('chat:leave', sessionId);
    };
  }, [isConnected, sessionId, emit]);

  /* ── Presence listener ───────────────────────────────────────
     No joinedRef dependency — always active when connected.
  ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isConnected || !sessionId) return;

    const handlePresence = ({ sessionId: sid, participants, count }: {
      sessionId:    string;
      participants: string[];
      count:        number;
    }) => {
      if (sid !== sessionId) return;
      setPresence({ participants, count });
    };

    on('chat:presence', handlePresence);
    return () => off('chat:presence', handlePresence);
  }, [isConnected, sessionId, on, off]);

  return presence;
}