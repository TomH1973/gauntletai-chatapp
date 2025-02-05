import { useState, useEffect } from 'react';
import { Socket, io } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket';

interface UseSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  isConnected: boolean;
  isReconnecting: boolean;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents>>();
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const socket = io('http://localhost:3001', {
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    setSocket(socket);

    socket.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('reconnecting', () => {
      setIsReconnecting(true);
    });

    socket.on('reconnect_failed', () => {
      setIsReconnecting(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return {
    socket: socket!,
    isConnected,
    isReconnecting,
  };
} 