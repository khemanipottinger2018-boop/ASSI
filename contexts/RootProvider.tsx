"use client";
import React from 'react';
import { AuthProvider } from './AuthContext';
import { SocketProvider } from './socket/SocketContext';
import { NotificationProvider } from './notifications/NotificationContext';
import { PresenceProvider } from './presence/PresenceContext';
import { ChatProvider } from './chat/ChatContext';

export const RootProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <SocketProvider>
        <NotificationProvider>
          <PresenceProvider>
            <ChatProvider>
              {children}
            </ChatProvider>
          </PresenceProvider>
        </NotificationProvider>
      </SocketProvider>
    </AuthProvider>
  );
};
