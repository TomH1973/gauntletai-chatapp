import { useEffect, useState } from 'react';
import { Socket as ClientSocket, connect } from 'socket.io-client';
import { useAuth } from '@clerk/nextjs';

export function useSocket() {
  const [socket, setSocket] = useState<typeof ClientSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    const initSocket = async () => {
      const token = await getToken();
      
      if (!token) {
        console.error('No auth token available');
        return;
      }

      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
      if (!socketUrl) {
        console.error('WebSocket URL not configured');
        return;
      }

      const newSocket = connect(socketUrl, {
        auth: { token },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      newSocket.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      });

      newSocket.on('error', (error: Error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    };

    initSocket();
  }, [getToken]);

  return { socket, isConnected };
} 