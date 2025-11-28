import { useState, useEffect, useCallback } from 'react';
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

  const connect = useCallback(() => {
    if (socket?.connected) return;

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

      setSocket(newSocket);
    } catch (err) {
      setError('Failed to initialize socket connection');
      setIsConnecting(false);
    }
  }, [socket]);

  const disconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setIsConnected(false);
    }
  }, [socket]);

  const emit = useCallback((event: string, data?: any) => {
    if (socket?.connected) {
      socket.emit(event, data);
    } else {
      console.warn('Socket not connected, cannot emit:', event);
    }
  }, [socket]);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  const off = useCallback((event: string) => {
    if (socket) {
      socket.off(event);
    }
  }, [socket]);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

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
