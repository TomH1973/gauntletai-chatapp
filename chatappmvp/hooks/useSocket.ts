import { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { useUser } from '@clerk/nextjs';

const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL || 'http://localhost:4000';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const { user } = useUser();

  const connectSocket = useCallback(() => {
    const newSocket = io(SOCKET_SERVER_URL, {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to Socket.IO server');
      if (user) {
        newSocket.emit('join_room', `user_${user.id}`);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log(`Disconnected: ${reason}`);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      if (user) {
        newSocket.emit('join_room', `user_${user.id}`);
      }
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Reconnection error:', error);
    });

    newSocket.on('error', (error) => {
      console.error('Socket.IO error:', error);
    });

    setSocket(newSocket);

    return newSocket;
  }, [user]);

  useEffect(() => {
    const newSocket = connectSocket();

    return () => {
      newSocket.close();
    };
  }, [connectSocket]);

  return socket;
};

