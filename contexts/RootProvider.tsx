"use client";
import React from 'react';
import { SocketProvider } from './socket/SocketContext';
import { NotificationProvider } from './NotificationContext';

export const RootProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SocketProvider>
      <NotificationProvider>
        {children}
      </NotificationProvider>
    </SocketProvider>
  );
};
