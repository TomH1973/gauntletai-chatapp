import { useState, useEffect } from 'react';
import { Manager } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket';

interface UseSocketReturn {
  socket: any | null;  // TODO: Fix type when Socket.IO types are working
  isConnected: boolean;
  isReconnecting: boolean;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<any | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const manager = new Manager(process.env.REACT_APP_API_URL || 'http://localhost:3001', {
      autoConnect: true,
      auth: {
        token: window.localStorage.getItem('token')
      }
    });

    const newSocket = manager.socket('/');

    newSocket.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setIsReconnecting(true);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return { socket, isConnected, isReconnecting };
} 