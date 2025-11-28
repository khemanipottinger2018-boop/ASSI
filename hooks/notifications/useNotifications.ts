import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../socket/useSocket';

export interface Notification {
  id: string;
  type: 'session_booked' | 'new_message' | 'payment_received' | 'system_announcement' | 'tutor_application_status' | 'session_reminder';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
  priority: 'low' | 'medium' | 'high';
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected, emit, on, off } = useSocket();

  // Join user notification room when connected
  useEffect(() => {
    if (isConnected) {
      const userId = localStorage.getItem('user_id') || JSON.parse(localStorage.getItem('user') || '{}').id;
      if (userId) {
        emit('join-user-room', userId);
      }
    }
  }, [isConnected, emit]);

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/notifications/recent');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
        setUnreadCount(data.data?.filter((n: any) => !n.is_read).length || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/notifications/${notificationId}/read`, {
        method: 'PATCH'
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === notificationId ? { ...notif, isRead: true } : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notifications/mark-all-read', {
        method: 'POST'
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  }, []);

  // Get unread count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3001/api/notifications/unread-count');
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  }, []);

  // Listen for real-time notifications - FIXED EVENT NAME
  useEffect(() => {
    if (!isConnected) return;

    const handleNewNotification = (data: { notification: any; unread_count: number }) => {
      const notification: Notification = {
        id: data.notification.notification_id,
        type: data.notification.type,
        title: data.notification.title,
        message: data.notification.message,
        data: data.notification.data,
        isRead: data.notification.is_read,
        createdAt: new Date(data.notification.created_at)
      };

      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(data.unread_count);

      // Show browser notification if permitted
      if (Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    };

    // Backend sends 'new-notification' (with dash)
    on('new-notification', handleNewNotification);

    return () => {
      off('new-notification');
    };
  }, [isConnected, on, off]);

  // Request notification permission
  const requestPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    requestPermission
  };
};
