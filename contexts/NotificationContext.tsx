'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// ✅ SPECIFIC PURPOSE: Handle real-time student-tutor interactions
interface Notification {
  notification_id: string;
  user_id: string;
  type: 'session_booked' | 'session_cancelled' | 'message_received' | 'tutor_approved' | 'payment_received';
  title: string;
  message: string;
  data: {
    session_id?: string;
    sender_id?: string;
    sender_name?: string;
    redirect_url?: string;
  };
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// ✅ CLEAR PURPOSE: Coordinate student-tutor platform interactions
export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // ✅ SPECIFIC: Fetch student/tutor notifications
  const fetchNotifications = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch('/api/notifications/recent', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setNotifications(result.data);
          const unread = result.data.filter((n: Notification) => !n.is_read).length;
          setUnreadCount(unread);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // ✅ SPECIFIC: Mark as read when student/tutor views notification
  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(notif => 
            notif.notification_id === notificationId 
              ? { ...notif, is_read: true } 
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // ✅ SPECIFIC: Mark all as read (clean slate for student/tutor)
  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // ✅ SPECIFIC: Show browser alerts for urgent student-tutor events
  const showBrowserNotification = useCallback((notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/logo.png',
        tag: notification.notification_id,
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.data?.redirect_url) {
          window.location.href = notification.data.redirect_url;
        }
        browserNotification.close();
      };

      setTimeout(() => browserNotification.close(), 5000);
    }
  }, []);

  // ✅ SPECIFIC: Handle real-time student-tutor events
  const handleNewNotification = useCallback((data: { notification: Notification; unread_count: number }) => {
    setNotifications(prev => [data.notification, ...prev]);
    setUnreadCount(data.unread_count);
    
    // Show browser alerts for critical student-tutor interactions
    if (['session_booked', 'tutor_approved', 'payment_received'].includes(data.notification.type)) {
      showBrowserNotification(data.notification);
    }
  }, [showBrowserNotification]);

  // ✅ SPECIFIC: Socket setup for real-time coordination
  useEffect(() => {
    // This would connect to our server-side socket service
    // For now, we'll keep the API-based approach
  }, [handleNewNotification, fetchNotifications]);

  // ✅ SPECIFIC: Initialize student/tutor notification system
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    fetchNotifications();
  }, [fetchNotifications]);

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    fetchNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ✅ CLEAR PURPOSE: Provide notification state to student/tutor components
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};