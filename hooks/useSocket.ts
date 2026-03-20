'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL!;

type AnyHandler = (...args: any[]) => void;

export function useSocket() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const options = useMemo(
    () => ({
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 400,
      reconnectionDelayMax: 2500,
      timeout: 8000,
    }),
    []
  );

  useEffect(() => {
    if (isLoading) return;

    // Logged out or no user — hard cleanup
    if (!isAuthenticated || !user?.id) {
      const s = socketRef.current;
      if (s) {
        s.removeAllListeners();
        s.disconnect();
        socketRef.current = null;
      }
      setIsConnected(false);
      return;
    }

    // If a socket exists (e.g. from a previous account), tear it down
    // before creating a new one for the current user
    if (socketRef.current) {
      socketRef.current.removeAllListeners();
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }

    const socket = io(SOCKET_URL, options);
    socketRef.current = socket;

    const handleConnect    = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect',    handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.on('connect_error', (err: any) => {
      setIsConnected(false);
      const msg = err?.message || String(err);
      console.error('[socket] connect_error:', msg);
    });

    // Small delay to ensure the browser has stored the session cookie
    // before the socket handshake fires — critical for cross-origin setups
    const connectTimer = setTimeout(() => socket.connect(), 150);

    return () => {
      clearTimeout(connectTimer);
      socket.off('connect',    handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error');
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [isAuthenticated, isLoading, user?.id, options]);

  const emit = useCallback(
    (event: string, payload?: any, callback?: (response: any) => void) => {
      socketRef.current?.emit(event, payload, callback);
    },
    []
  );

  const subscribe = useCallback((event: string, handler: AnyHandler) => {
    const s = socketRef.current;
    if (!s) return () => {};
    s.on(event, handler);
    return () => s.off(event, handler);
  }, []);

  const on = useCallback((event: string, handler: AnyHandler) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler?: AnyHandler) => {
    socketRef.current?.off(event, handler as any);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    subscribe,
    on,
    off,
  };
}