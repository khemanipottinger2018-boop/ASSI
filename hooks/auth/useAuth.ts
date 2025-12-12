'use client';
import { useState, useCallback, useEffect } from 'react';

export type UserRole = 'student' | 'tutor-applicant' | 'tutor' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isStudent: boolean;
  isTutor: boolean;
  isAdmin: boolean;
  disclaimerAccepted: boolean;
}

export const useAuthHook = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current user using refresh endpoint
  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/refresh', { credentials: 'include', method: 'POST' });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setUser({
          ...data.user,
          isStudent: data.user.role === 'student',
          isTutor: data.user.role === 'tutor',
          isAdmin: data.user.role === 'admin',
        });
      } else {
        setUser(null);
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch user');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login
  const login = useCallback(
    async (email: string, password: string, rememberMe = true) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email, password, rememberMe }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Login failed');
        await refreshUser();
      } catch (err: any) {
        setError(err.message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshUser]
  );

  // Logout
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      window.location.href = '/';
    }
  }, []);

  // On mount, refresh user
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return { user, isLoading, error, login, logout, refreshUser, isAuthenticated: !!user };
};
