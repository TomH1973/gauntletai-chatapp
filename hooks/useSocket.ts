import { useState, useEffect } from 'react';
import { Socket as IOSocket } from 'socket.io-client';
import { connect } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket';
import { useAuth } from '@/contexts/auth-context';

interface UseSocketReturn {
  socket: IOSocket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
  isReconnecting: boolean;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<IOSocket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const { userId, isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn || !userId) {
      return;
    }

    // Let's get this party started! 🎉
    const socketInstance = connect(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
      auth: { userId },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketInstance.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
    });

    socketInstance.on('disconnect', () => {
      setIsConnected(false);
    });

    socketInstance.on('reconnecting', () => {
      setIsReconnecting(true);
    });

    socketInstance.on('reconnect', () => {
      setIsReconnecting(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [userId, isSignedIn]);

  return { socket, isConnected, isReconnecting };
} 