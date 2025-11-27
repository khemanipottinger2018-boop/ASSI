import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../socket/useSocket';

export type UserStatus = 'online' | 'offline' | 'idle' | 'busy' | 'in_session' | 'dnd';

export interface UserPresence {
  userId: string;
  status: UserStatus;
  lastSeen?: Date;
  lastActivity: Date;
  manualOverride: boolean;
}

export const usePresence = (userId?: string) => {
  const [userStatus, setUserStatus] = useState<UserStatus>('offline');
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());
  const { isConnected, emit, on, off } = useSocket();

  // Update own status
  const updateStatus = useCallback((status: UserStatus) => {
    if (!userId) return;

    emit('update_presence', {
      userId,
      status,
      timestamp: new Date().toISOString()
    });
    
    setUserStatus(status);
  }, [userId, emit]);

  // Report user activity
  const reportActivity = useCallback(() => {
    if (!userId || userStatus === 'offline') return;

    const now = new Date();
    setLastActivity(now);

    // If user was idle, bring them back online
    if (userStatus === 'idle') {
      updateStatus('online');
    }

    // Emit activity to server
    emit('user_activity', {
      userId,
      timestamp: now.toISOString()
    });
  }, [userId, userStatus, updateStatus, emit]);

  // Get status for specific user
  const getUserStatus = useCallback((targetUserId: string): UserStatus => {
    const user = onlineUsers.find(u => u.userId === targetUserId);
    return user?.status || 'offline';
  }, [onlineUsers]);

  // Set manual status (DND, Busy, etc.)
  const setManualStatus = useCallback((status: UserStatus) => {
    updateStatus(status);
  }, [updateStatus]);

  // Listen for presence updates
  useEffect(() => {
    if (!isConnected || !userId) return;

    const handlePresenceUpdate = (data: { users: UserPresence[] }) => {
      setOnlineUsers(data.users);
      
      // Find current user's status
      const currentUser = data.users.find(u => u.userId === userId);
      if (currentUser) {
        setUserStatus(currentUser.status);
      }
    };

    const handleUserStatusChange = (data: { userId: string; status: UserStatus }) => {
      setOnlineUsers(prev => {
        const existingUserIndex = prev.findIndex(u => u.userId === data.userId);
        if (existingUserIndex >= 0) {
          const updated = [...prev];
          updated[existingUserIndex] = { 
            ...updated[existingUserIndex], 
            status: data.status,
            lastActivity: new Date()
          };
          return updated;
        }
        return prev;
      });
    };

    on('presence_update', handlePresenceUpdate);
    on('user_status_changed', handleUserStatusChange);

    // Initialize presence
    emit('join_presence', { userId });
    updateStatus('online');

    return () => {
      off('presence_update');
      off('user_status_changed');
      // Mark as offline when leaving
      if (userId) {
        emit('update_presence', { userId, status: 'offline' });
      }
    };
  }, [isConnected, userId, emit, on, off, updateStatus]);

  // Activity tracking - mark as idle after 15 minutes
  useEffect(() => {
    if (!isConnected || userStatus === 'offline') return;

    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      reportActivity();
    };

    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    const idleTimer = setTimeout(() => {
      if (userStatus === 'online') {
        updateStatus('idle');
      }
    }, 15 * 60 * 1000); // 15 minutes

    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimeout(idleTimer);
    };
  }, [isConnected, userStatus, reportActivity, updateStatus]);

  return {
    userStatus,
    onlineUsers,
    lastActivity,
    updateStatus,
    setManualStatus,
    getUserStatus,
    reportActivity,
    onlineCount: onlineUsers.filter(u => u.status === 'online').length,
    busyCount: onlineUsers.filter(u => u.status === 'busy' || u.status === 'in_session').length
  };
};
