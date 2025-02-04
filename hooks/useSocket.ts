import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useUser } from '@clerk/nextjs';

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    if (!user?.id) return;

    const socket = io('http://localhost:3002', {
      auth: {
        userId: user.id
      }
    });

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    setSocket(socket);

    return () => {
      socket.disconnect();
    };
  }, [user?.id]);

  return socket;
} 