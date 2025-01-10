'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { debounce } from '@/lib/utils';

/**
 * @interface TypingUser
 * @description Interface for users who are currently typing
 */
interface TypingUser {
  /** User's unique identifier */
  id: string;
  /** User's display name */
  username: string;
}

/**
 * @hook useTyping
 * @description Custom hook for managing typing indicators in a thread
 * 
 * Features:
 * - Real-time typing status updates
 * - Debounced typing notifications
 * - Automatic cleanup
 * - Thread-specific tracking
 * 
 * @param {string} threadId - ID of the thread to track typing in
 * @returns {Object} Typing state and control functions
 * @property {TypingUser[]} typingUsers - Array of currently typing users
 * @property {() => void} startTyping - Function to indicate user started typing
 * @property {() => void} stopTyping - Function to indicate user stopped typing
 * 
 * @example
 * ```tsx
 * const { typingUsers, startTyping, stopTyping } = useTyping(threadId);
 * 
 * // Show typing indicator
 * {typingUsers.length > 0 && (
 *   <div>{typingUsers[0].username} is typing...</div>
 * )}
 * ```
 */
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