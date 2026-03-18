'use client';

import { useEffect, useRef, useState } from 'react';
import { useChatSocket } from './useChatSocket';

interface Presence {
  participants: string[];
  count: number;
}

export function useChatRoom(sessionId: string) {
  const { emit, on, off, isConnected } = useChatSocket();
  const joinedRef = useRef(false);
  const [presence, setPresence] = useState<Presence>({ participants: [], count: 0 });

  useEffect(() => {
    if (!isConnected || !sessionId) return;
    if (joinedRef.current) return;

    joinedRef.current = true;
    emit('chat:join', sessionId);

    const handlePresence = ({ sessionId: sid, participants, count }: { sessionId: string; participants: string[]; count: number }) => {
      if (sid !== sessionId) return;
      setPresence({ participants, count });
    };

    on('chat:presence', handlePresence);

    return () => {
      joinedRef.current = false;
      emit('chat:leave', sessionId);
      off('chat:presence', handlePresence);
    };
  }, [isConnected, sessionId, emit, on, off]);

  return presence;
}