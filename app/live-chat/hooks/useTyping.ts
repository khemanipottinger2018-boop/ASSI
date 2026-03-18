'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useChatSocket } from './useChatSocket';

export function useTyping(sessionId: string) {
  const { emit, on, off, isConnected } = useChatSocket();
  const isTypingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isConnected || !sessionId) return;

    const handleTyping = ({ userId, typing }: { userId: string; typing: boolean }) => {
      setTypingUsers((prev) => ({ ...prev, [userId]: typing }));
    };

    on('chat:typing', handleTyping);
    return () => off('chat:typing', handleTyping);
  }, [isConnected, sessionId, on, off]);

  const onKeystroke = useCallback(() => {
    if (!isConnected) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emit('chat:typing:start', { sessionId });
    }

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emit('chat:typing:stop', { sessionId });
    }, 2000);
  }, [emit, sessionId, isConnected]);

  const stopTyping = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      emit('chat:typing:stop', { sessionId });
    }
  }, [emit, sessionId]);

  const someoneIsTyping = Object.values(typingUsers).some(Boolean);

  return { onKeystroke, stopTyping, someoneIsTyping };
}