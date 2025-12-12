'use client';
import React, { createContext, useContext, ReactNode } from 'react';
import { useAuthHook, User } from '@/hooks/auth/useAuth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading, error, login, logout, refreshUser, isAuthenticated } = useAuthHook();

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout, refreshUser, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
