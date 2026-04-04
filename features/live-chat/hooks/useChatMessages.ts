'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useChatSocket } from './useChatSocket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface ChatMessage {
  messageId:   string;
  sessionId:   string;
  senderId:    string;
  senderName?: string;   // populated in group/conference views
  content:     string;
  timestamp:   number;
}

export function useChatMessages(
  sessionId: string,
  sender?: { id: string; name?: string },
) {
  const { emit, on, off, isConnected } = useChatSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  /* ── Hydrate history on mount ────────────────────────────────
     Fetch persisted messages from Redis before socket takes over.
     Without this, reconnecting users see a blank chat.
  ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;

    async function loadHistory() {
      try {
        const res = await fetch(
          `${API_URL}/api/live-chat/${sessionId}/messages`,
          { credentials: 'include' }
        );
        if (!res.ok) return;

        const data = await res.json();
        if (cancelled) return;

        const history: ChatMessage[] = (data.messages ?? []).map((m: any) => ({
          messageId:  String(m.messageId),
          sessionId:  String(m.sessionId ?? sessionId),
          senderId:   String(m.senderId),
          senderName: m.senderName ?? undefined,
          content:    String(m.content),
          timestamp:  Number(m.timestamp),
        }));

        setMessages(history);
      } catch {
        // silent — socket messages still arrive
      }
    }

    loadHistory();
    return () => { cancelled = true; };
  }, [sessionId]);

  /* ── Real-time socket messages ───────────────────────────────
     Deduplicates against history by messageId.
  ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!isConnected || !sessionId) return;

    const handleMessage = (msg: ChatMessage) => {
      if (msg.sessionId !== sessionId) return;
      setMessages(prev => {
        if (prev.some(m => m.messageId === msg.messageId)) return prev;
        return [...prev, msg];
      });
    };

    on('chat:message', handleMessage);
    return () => off('chat:message', handleMessage);
  }, [isConnected, sessionId, on, off]);

  /* ── Send (1-second rate limit) ─────────────────────────── */
  const lastSentRef = useRef(0);
  const SEND_COOLDOWN_MS = 1000;

  const sendMessage = useCallback(
    (content: string) => {
      const now = Date.now();
      if (!content.trim() || now - lastSentRef.current < SEND_COOLDOWN_MS) return;
      lastSentRef.current = now;
      const messageId = crypto.randomUUID();
      const trimmed   = content.trim();

      // Optimistic update — show message immediately without waiting for echo
      if (sender?.id) {
        setMessages(prev => {
          if (prev.some(m => m.messageId === messageId)) return prev;
          return [...prev, {
            messageId,
            sessionId,
            senderId:   sender.id,
            senderName: sender.name,
            content:    trimmed,
            timestamp:  Date.now(),
          }];
        });
      }

      emit('chat:message', { sessionId, content: trimmed, messageId });
    },
    [emit, sender, sessionId]
  );

  return { messages, sendMessage };
}
