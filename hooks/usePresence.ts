import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';

interface PresenceState {
  onlineUsers: Set<string>;
  lastSeenTimes: Map<string, Date>;
}

export function usePresence() {
  const { socket } = useSocket();
  const [state, setState] = useState<PresenceState>({
    onlineUsers: new Set(),
    lastSeenTimes: new Map(),
  });

  useEffect(() => {
    if (!socket) return;

    // Set up ping interval
    const interval = setInterval(() => {
      socket.emit('presence:ping');
    }, 30000); // Every 30 seconds

    // Initial ping
    socket.emit('presence:ping');

    // Handle presence events
    socket.on('presence:pong', (data) => {
      setState(prev => ({
        onlineUsers: new Set(data.onlineUsers),
        lastSeenTimes: new Map(Object.entries(data.lastSeenTimes).map(([id, time]) => [id, new Date(time)])),
      }));
    });

    socket.on('presence:online', (data) => {
      setState(prev => ({
        ...prev,
        onlineUsers: new Set([...prev.onlineUsers, data.userId]),
      }));
    });

    socket.on('presence:offline', (data) => {
      setState(prev => {
        const newOnlineUsers = new Set(prev.onlineUsers);
        newOnlineUsers.delete(data.userId);
        const newLastSeenTimes = new Map(prev.lastSeenTimes);
        newLastSeenTimes.set(data.userId, data.lastSeen);
        return {
          onlineUsers: newOnlineUsers,
          lastSeenTimes: newLastSeenTimes,
        };
      });
    });

    return () => {
      clearInterval(interval);
      socket.off('presence:pong');
      socket.off('presence:online');
      socket.off('presence:offline');
    };
  }, [socket]);

  const isOnline = (userId: string) => state.onlineUsers.has(userId);
  const getLastSeen = (userId: string) => state.lastSeenTimes.get(userId);

  return {
    isOnline,
    getLastSeen,
    onlineUsers: Array.from(state.onlineUsers),
  };
} 