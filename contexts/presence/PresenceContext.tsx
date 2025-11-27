'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { usePresence, UserStatus } from '../../hooks/presence/usePresence';

interface PresenceContextType {
  userStatus: UserStatus;
  onlineUsers: any[];
  onlineCount: number;
  busyCount: number;
  updateStatus: (status: UserStatus) => void;
  setManualStatus: (status: UserStatus) => void;
  getUserStatus: (userId: string) => UserStatus;
  reportActivity: () => void;
}

const PresenceContext = createContext<PresenceContextType | undefined>(undefined);

export const usePresenceContext = () => {
  const context = useContext(PresenceContext);
  if (context === undefined) {
    throw new Error('usePresenceContext must be used within a PresenceProvider');
  }
  return context;
};

interface PresenceProviderProps {
  children: ReactNode;
  userId?: string;
}

export const PresenceProvider: React.FC<PresenceProviderProps> = ({ children, userId }) => {
  const presenceData = usePresence(userId);

  return (
    <PresenceContext.Provider value={presenceData}>
      {children}
    </PresenceContext.Provider>
  );
};
