'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useChatSocket } from './useChatSocket';

export type ChatMessage = {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  createdAt: number;
  seq: number;
};

type UseChatMessagesOptions = {
  chatId: string | null;
};

export function useChatMessages({ chatId }: UseChatMessagesOptions) {
  const { emit, on, off, isConnected } = useChatSocket();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const lastSeqRef = useRef<number>(0);

  /* ---------------------------------------------------
   * RESET ON CHAT CHANGE
   * --------------------------------------------------- */
  useEffect(() => {
    setMessages([]);
    lastSeqRef.current = 0;
  }, [chatId]);

  /* ---------------------------------------------------
   * RECEIVE NEW MESSAGE (LIVE)
   * --------------------------------------------------- */
  useEffect(() => {
    if (!chatId) return;

    const handleNewMessage = (message: ChatMessage) => {
      if (message.chatId !== chatId) return;
      if (message.seq <= lastSeqRef.current) return;

      lastSeqRef.current = message.seq;
      setMessages((prev) => [...prev, message]);
    };

    on('chat:new', handleNewMessage);
    return () => off('chat:new', handleNewMessage);
  }, [chatId, on, off]);

  /* ---------------------------------------------------
   * INITIAL SYNC / RECONNECT SYNC
   * --------------------------------------------------- */
  useEffect(() => {
    if (!chatId || !isConnected) return;

    emit(
      'chat:sync',
      {
        chatId,
        afterSeq: lastSeqRef.current,
        limit: 100,
      },
      (res: {
        ok: boolean;
        messages?: ChatMessage[];
        error?: string;
      }) => {
        if (!res?.ok || !res.messages?.length) return;

        setMessages((prev) => {
          const merged = [...prev];

          for (const msg of res.messages!) {
            if (!merged.find((m) => m.id === msg.id)) {
              merged.push(msg);
              lastSeqRef.current = Math.max(
                lastSeqRef.current,
                msg.seq
              );
            }
          }

          return merged.sort((a, b) => a.seq - b.seq);
        });
      }
    );
  }, [chatId, isConnected, emit]);

  /* ---------------------------------------------------
   * SEND MESSAGE (ACK-BASED)
   * --------------------------------------------------- */
  const sendMessage = useCallback(
    (content: string) => {
      if (!chatId || !content.trim()) return;

      emit(
        'chat:send',
        {
          chatId,
          content,
          clientMsgId: crypto.randomUUID(),
        },
        (res: {
          ok: boolean;
          message?: ChatMessage;
          error?: string;
        }) => {
          if (!res?.ok || !res.message) return;

          const msg = res.message;

          setMessages((prev) => {
            if (prev.find((m) => m.id === msg.id)) return prev;
            lastSeqRef.current = msg.seq;
            return [...prev, msg].sort((a, b) => a.seq - b.seq);
          });
        }
      );
    },
    [chatId, emit]
  );

  return {
    messages,
    sendMessage,
    lastSeq: lastSeqRef.current,
  };
}
