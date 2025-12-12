'use client';

import { useEffect, useState, useCallback } from 'react';
import { useChatSocket } from './useChatSocket';

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: number;
  read?: boolean;
};

export function useNotifications(userId: string | null) {
  const { on, off } = useChatSocket();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  /* ---------------------------------------------------
   * INITIAL LOAD
   * --------------------------------------------------- */
  const fetchNotifications = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const res = await fetch('/api/notifications', {
        credentials: 'include',
      });

      if (!res.ok) return;

      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  /* ---------------------------------------------------
   * REALTIME PUSH
   * --------------------------------------------------- */
  useEffect(() => {
    if (!userId) return;

    const handleNewNotification = (notification: NotificationItem) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
    };

    on('notification:new', handleNewNotification);
    return () => off('notification:new', handleNewNotification);
  }, [userId, on, off]);

  /* ---------------------------------------------------
   * MARK READ
   * --------------------------------------------------- */
  const markAllRead = useCallback(async () => {
    if (!userId) return;

    await fetch('/api/notifications/read-all', {
      method: 'POST',
      credentials: 'include',
    });

    setUnreadCount(0);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  }, [userId]);

  /* ---------------------------------------------------
   * BOOTSTRAP
   * --------------------------------------------------- */
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAllRead,
    refetch: fetchNotifications,
  };
}
