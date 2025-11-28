import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../socket/useSocket';

export type UserStatus = 'online' | 'offline' | 'idle' | 'busy' | 'in_session';

export interface UserPresence {
  userId: string;
  status: UserStatus;
  lastSeen?: number;
  username?: string;
}

export const usePresence = (userId?: string) => {
  const [userStatus, setUserStatus] = useState<UserStatus>('offline');
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const { isConnected, emit, on, off } = useSocket();

  // Update own status
  const updateStatus = useCallback((status: UserStatus) => {
    if (!userId) return;

    emit('set_status', { status });
    setUserStatus(status);
  }, [userId, emit]);

  // Get status for specific users
  const getUsersStatus = useCallback((userIds: string[]) => {
    emit('get_presence', { userIds });
  }, [emit]);

  // Listen for presence updates
  useEffect(() => {
    if (!isConnected) return;

    const handlePresenceUpdate = (update: UserPresence) => {
      setOnlineUsers(prev => {
        const existingIndex = prev.findIndex(u => u.userId === update.userId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = update;
          return updated;
        }
        return [...prev, update];
      });

      // Update own status if it's us
      if (update.userId === userId) {
        setUserStatus(update.status);
      }
    };

    const handleUserPresenceUpdated = (update: UserPresence) => {
      setOnlineUsers(prev => {
        const existingIndex = prev.findIndex(u => u.userId === update.userId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = update;
          return updated;
        }
        return [...prev, update];
      });
    };

    on('presence_updated', handlePresenceUpdate);
    on('user_presence_updated', handleUserPresenceUpdated);

    // Set initial status
    if (userId) {
      updateStatus('online');
    }

    return () => {
      off('presence_updated');
      off('user_presence_updated');
    };
  }, [isConnected, userId, updateStatus, on, off]);

  return {
    userStatus,
    onlineUsers,
    updateStatus,
    getUsersStatus,
    onlineCount: onlineUsers.filter(u => u.status === 'online').length,
  };
};
