'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { debounce } from '@/lib/utils';

interface TypingUser {
  id: string;
  username: string;
}

export function useTyping(threadId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    const handleTypingUpdate = (data: {
      threadId: string;
      users: TypingUser[];
    }) => {
      if (data.threadId === threadId) {
        setTypingUsers(data.users);
      }
    };

    socket.on('typing:update', handleTypingUpdate);

    return () => {
      socket.off('typing:update', handleTypingUpdate);
    };
  }, [socket, threadId]);

  const startTyping = useCallback(
    debounce(() => {
      if (socket) {
        socket.emit('typing:start', threadId);
      }
    }, 500),
    [socket, threadId]
  );

  const stopTyping = useCallback(() => {
    if (socket) {
      socket.emit('typing:stop', threadId);
    }
  }, [socket, threadId]);

  return {
    typingUsers,
    startTyping,
    stopTyping,
  };
} 