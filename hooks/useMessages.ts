'use client';

/**
 * useMessages
 *
 * Fetches and manages the message inbox.
 * Mirrors the useNotifications pattern exactly.
 *
 * Backend endpoints:
 *   GET  /api/messages/inbox          → { success, messages }
 *   GET  /api/messages/unread-count   → { success, count }
 *   POST /api/messages/read-all       → { success }
 *   PATCH /api/messages/:id/read      → { success }
 *
 * Real-time: listens to socket events:
 *   'message:new'       — direct message received
 *   'message:broadcast' — broadcast received
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth }    from '@/contexts/AuthContext';
import { useSocket }  from '@/hooks/useSocket';
import { messagesApi } from '@/lib/api';
import type { InboxMessage } from '@/lib/api';

export function useMessages() {
  const { isAuthenticated } = useAuth();
  const { subscribe }       = useSocket();

  const [messages,    setMessages]    = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      setError(null);
      const data = await messagesApi.getInbox();
      const msgs = data.messages ?? [];
      setMessages(msgs);
      setUnreadCount(msgs.filter(m => !m.isRead).length);
    } catch {
      setError('Could not load messages');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setMessages([]);
      setUnreadCount(0);
      setError(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [isAuthenticated, refresh]);

  /* ── Real-time: direct message ── */
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubDirect = subscribe('message:new', (payload: any) => {
      const incoming: InboxMessage = {
        id:          String(payload.messageId ?? payload.id ?? Date.now()),
        senderId:    payload.senderId ?? '',
        senderName:  payload.senderName ?? 'Someone',
        receiverId:  payload.receiverId ?? null,
        context:     payload.context ?? 'direct',
        subject:     payload.subject ?? null,
        content:     payload.preview ?? '',
        parentId:    null,
        isRead:      false,
        createdAt:   payload.createdAt ?? new Date().toISOString(),
        replyCount:  0,
      };

      setMessages(prev => {
        if (prev.some(m => m.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });
      setUnreadCount(count => count + 1);
    });

    return unsubDirect;
  }, [isAuthenticated, subscribe]);

  /* ── Real-time: broadcast ── */
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubBroadcast = subscribe('message:broadcast', (payload: any) => {
      const incoming: InboxMessage = {
        id:          String(payload.messageId ?? payload.id ?? Date.now()),
        senderId:    payload.senderId ?? '',
        senderName:  'ASSI',
        receiverId:  null,
        context:     'broadcast',
        subject:     payload.subject ?? null,
        content:     payload.preview ?? '',
        parentId:    null,
        isRead:      false,
        createdAt:   payload.createdAt ?? new Date().toISOString(),
        replyCount:  0,
      };

      setMessages(prev => {
        if (prev.some(m => m.id === incoming.id)) return prev;
        return [incoming, ...prev];
      });
      setUnreadCount(count => count + 1);
    });

    return unsubBroadcast;
  }, [isAuthenticated, subscribe]);

  /* ── Mark one read ── */
  const markRead = useCallback(async (id: string) => {
    if (!isAuthenticated) return;

    // Optimistic
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      await messagesApi.markRead(id);
    } catch {
      await refresh();
    }
  }, [isAuthenticated, refresh]);

  /* ── Mark all read ── */
  const markAllRead = useCallback(async () => {
    if (!isAuthenticated) return;

    // Optimistic
    setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
    setUnreadCount(0);

    try {
      await messagesApi.markAllRead();
    } catch {
      await refresh();
    }
  }, [isAuthenticated, refresh]);

  return {
    messages,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  };
}