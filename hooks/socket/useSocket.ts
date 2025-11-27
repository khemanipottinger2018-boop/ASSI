import { useState, useEffect, useCallback } from 'react';
import { socketClient } from '../../../lib/socket/client';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  const connect = useCallback(() => {
    socketClient.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketClient.disconnect();
    setIsConnected(false);
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    socketClient.emit(event, data);
  }, []);

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    socketClient.on(event, callback);
  }, []);

  const off = useCallback((event: string) => {
    socketClient.off(event);
  }, []);

  useEffect(() => {
    // Set up connection listeners
    const handleConnect = () => {
      setIsConnected(true);
      setIsConnecting(false);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsConnecting(false);
    };

    // Listen to socket events
    socketClient.on('connect', handleConnect);
    socketClient.on('disconnect', handleDisconnect);

    // Auto-connect
    connect();

    // Cleanup
    return () => {
      socketClient.off('connect');
      socketClient.off('disconnect');
    };
  }, [connect]);

  return {
    isConnected,
    isConnecting,
    connect,
    disconnect,
    emit,
    on,
    off,
    socket: socketClient.getSocket()
  };
};
