import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string) => void;
}

export const useSocket = (): UseSocketReturn => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // FIXED: connect doesn't depend on socket state
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('auth_token');

      const newSocket = io('http://localhost:3001', {
        auth: {
          token: token
        },
        transports: ['websocket'],
        autoConnect: true,
      });

      newSocket.on('connect', () => {
        setIsConnected(true);
        setIsConnecting(false);
        console.log('🚀 Socket connected successfully!');
      });

      newSocket.on('disconnect', () => {
        setIsConnected(false);
        setIsConnecting(false);
        console.log('🔌 Socket disconnected');
      });

      newSocket.on('connect_error', (err) => {
        setError(err.message);
        setIsConnecting(false);
        console.error('💥 Socket connection error:', err);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    } catch (err) {
      setError('Failed to initialize socket connection');
      setIsConnecting(false);
    }
  }, []); // FIXED: Empty dependencies

  // FIXED: disconnect uses ref instead of state
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }
  }, []); // FIXED: Empty dependencies

  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }, []); // FIXED: Empty dependencies

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []); // FIXED: Empty dependencies

  const off = useCallback((event: string) => {
    if (socketRef.current) {
      socketRef.current.off(event);
    }
  }, []); // FIXED: Empty dependencies

  // FIXED: Only connect once on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, []); // FIXED: Empty dependencies - run once

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
  };
};
