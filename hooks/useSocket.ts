'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/contexts/AuthContext';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

type AnyHandler = (...args: any[]) => void;

export function useSocket() {
  const { user, isAuthenticated, isLoading } = useAuth();

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  /**
   * IMPORTANT:
   * - keep options stable
   * - do NOT autoConnect; we will connect explicitly once auth is settled
   * - identity must come from cookie (withCredentials: true)
   */
  const options = useMemo(
    () => ({
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: false,

      // Safer reconnection behavior (avoid aggressive loops during auth mismatch)
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 400,
      reconnectionDelayMax: 2500,
      timeout: 8000,

      // If your server sets a custom path, uncomment and match backend:
      // path: '/socket.io',
    }),
    []
  );

  useEffect(() => {
    if (isLoading) return;

    // Logged out or no user -> hard cleanup.
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

    // Already initialized.
    if (socketRef.current) return;

    const socket = io(SOCKET_URL, options);
    socketRef.current = socket;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    socket.on('connect_error', (err: any) => {
      setIsConnected(false);

      // Common when cookie session isn't present/valid yet
      const msg = err?.message || String(err);
      console.error('[socket] connect_error:', msg);

      /**
       * OPTIONAL: if your backend emits a recognizable auth error message
       * you can choose to stop reconnecting to prevent infinite loops:
       *
       * if (msg.toLowerCase().includes('unauthorized')) socket.disconnect();
       */
    });

    // Explicit connect once listeners are attached.
    socket.connect();

    return () => {
      socket.off('connect', handleConnect);
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

  /**
   * Preferred listener API (Strict Mode safe if used correctly)
   */
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