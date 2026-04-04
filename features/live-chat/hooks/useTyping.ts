'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useChatSocket } from './useChatSocket';

export function useTyping(sessionId: string) {
  const { emit, on, off, isConnected } = useChatSocket();
  const isTypingRef = useRef(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // userId → username map; entry absent when not typing
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isConnected || !sessionId) return;

    const handleTyping = ({ userId, typing, username }: { userId: string; typing: boolean; username?: string }) => {
      setTypingUsers(prev => {
        if (!typing) {
          const next = { ...prev };
          delete next[userId];
          return next;
        }
        return { ...prev, [userId]: username ?? userId };
      });
    };

    on('chat:typing', handleTyping);
    return () => off('chat:typing', handleTyping);
  }, [isConnected, sessionId, on, off]);

  // Clear timer on unmount — prevents timeout firing into unmounted component
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

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

  const typingUsernames = Object.values(typingUsers);
  const someoneIsTyping = typingUsernames.length > 0; // kept for backward-compat callers

  return { onKeystroke, stopTyping, someoneIsTyping, typingUsernames };
}
