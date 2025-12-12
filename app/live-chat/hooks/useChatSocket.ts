'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type UseChatSocketResult = {
  socket: Socket | null;
  isConnected: boolean;

  emit: <T = any, R = any>(
    event: string,
    payload?: T,
    ack?: (response: R) => void
  ) => void;

  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
};

export function useChatSocket(): UseChatSocketResult {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  /* ---------------------------------------------------
   * INITIALIZE SOCKET (SINGLETON PER USER SESSION)
   * --------------------------------------------------- */
  useEffect(() => {
    if (socketRef.current) return;

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
      transports: ['websocket'],
      withCredentials: true,
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('🟢 Socket connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('🔴 Socket disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('❌ Socket connection error:', err.message);
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------
   * EMIT (ACK-SAFE)
   * --------------------------------------------------- */
  const emit = useCallback(
    <T = any, R = any>(
      event: string,
      payload?: T,
      ack?: (response: R) => void
    ) => {
      if (!socketRef.current || !socketRef.current.connected) return;

      if (ack) {
        socketRef.current.emit(event, payload, ack);
      } else {
        socketRef.current.emit(event, payload);
      }
    },
    []
  );

  /* ---------------------------------------------------
   * LISTENERS
   * --------------------------------------------------- */
  const on = useCallback(
    (event: string, handler: (...args: any[]) => void) => {
      socketRef.current?.on(event, handler);
    },
    []
  );

  const off = useCallback(
    (event: string, handler?: (...args: any[]) => void) => {
      socketRef.current?.off(event, handler);
    },
    []
  );

  return {
    socket: socketRef.current,
    isConnected,
    emit,
    on,
    off,
  };
}
