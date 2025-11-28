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

  // Update own status - MATCHES BACKEND setUserStatus
  const updateStatus = useCallback((status: UserStatus) => {
    if (!userId) return;

    emit('set_user_status', { status }); // Backend expects 'set_user_status'
    setUserStatus(status);
  }, [userId, emit]);

  // Get status for specific users - MATCHES BACKEND getUserStatus
  const getUsersStatus = useCallback((userIds: string[]) => {
    emit('get_user_status', { userIds }); // Backend expects 'get_user_status'
  }, [emit]);

  // Listen for presence updates - MATCHES BACKEND notifyPresenceUpdate
  useEffect(() => {
    if (!isConnected) return;

    const handlePresenceUpdate = (update: { userId: string; status: UserStatus; ts: number }) => {
      const userPresence: UserPresence = {
        userId: update.userId,
        status: update.status,
        lastSeen: update.ts
      };

      setOnlineUsers(prev => {
        const existingIndex = prev.findIndex(u => u.userId === update.userId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = userPresence;
          return updated;
        }
        return [...prev, userPresence];
      });

      // Update own status if it's us
      if (update.userId === userId) {
        setUserStatus(update.status);
      }
    };

    // Backend sends 'presence_update' events
    on('presence_update', handlePresenceUpdate);

    // Set initial status when connected
    if (userId && isConnected) {
      updateStatus('online');
    }

    return () => {
      off('presence_update');
    };
  }, [isConnected, userId, updateStatus, on, off]);

  // Fetch initial online users
  useEffect(() => {
    if (isConnected) {
      // Request current online users from backend
      emit('get_online_users');
    }
  }, [isConnected, emit]);

  return {
    userStatus,
    onlineUsers,
    updateStatus,
    getUsersStatus,
    onlineCount: onlineUsers.filter(u => u.status === 'online').length,
    totalOnline: onlineUsers.length
  };
};
