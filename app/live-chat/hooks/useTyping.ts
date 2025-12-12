'use client';

import { useEffect, useState, useCallback } from 'react';
import { useChatSocket } from './useChatSocket';

type UseTypingOptions = {
  chatId: string | null;
  currentUserId: string;
};

export function useTyping({
  chatId,
  currentUserId,
}: UseTypingOptions) {
  const { emit, on, off } = useChatSocket();

  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  /* ---------------------------------------------------
   * RECEIVE TYPING UPDATES
   * --------------------------------------------------- */
  useEffect(() => {
    if (!chatId) {
      setTypingUsers([]);
      return;
    }

    const handleTypingUpdate = (payload: { users: string[] }) => {
      if (!Array.isArray(payload.users)) return;

      // Exclude self
      setTypingUsers(
        payload.users.filter((id) => id !== currentUserId)
      );
    };

    on('typing:update', handleTypingUpdate);
    return () => off('typing:update', handleTypingUpdate);
  }, [chatId, currentUserId, on, off]);

  /* ---------------------------------------------------
   * EMITTERS
   * --------------------------------------------------- */
  const startTyping = useCallback(() => {
    if (!chatId) return;
    emit('typing:start', chatId);
  }, [chatId, emit]);

  const stopTyping = useCallback(() => {
    if (!chatId) return;
    emit('typing:stop', chatId);
  }, [chatId, emit]);

  return {
    typingUsers,
    isSomeoneTyping: typingUsers.length > 0,
    startTyping,
    stopTyping,
  };
}
