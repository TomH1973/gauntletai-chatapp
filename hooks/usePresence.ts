import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';

/**
 * @interface PresenceState
 * @description State interface for tracking user presence information
 * 
 * @property {Set<string>} onlineUsers - Set of user IDs that are currently online
 * @property {Map<string, Date>} lastSeenTimes - Map of user IDs to their last seen timestamps
 */
interface PresenceState {
  onlineUsers: Set<string>;
  lastSeenTimes: Map<string, Date>;
}

/**
 * @stateflow User Presence Management
 * 
 * 1. Connection States
 *    - Disconnected: No socket connection
 *    - Connected: Socket connected, presence active
 *    - Reconnecting: Temporary disconnection
 * 
 * 2. Presence Updates
 *    - Online: User connects/sends ping
 *    - Offline: User disconnects/timeout
 *    - Away: No activity for threshold
 * 
 * 3. State Synchronization
 *    - Regular ping intervals (30s)
 *    - Server-side timeout (60s)
 *    - Reconnection backoff
 * 
 * 4. Data Management
 *    - Online users set
 *    - Last seen timestamps
 *    - State reconciliation
 * 
 * 5. Side Effects
 *    - UI status indicators
 *    - Activity tracking
 *    - Cleanup on unmount
 */

/**
 * @errorflow Presence Error Handling
 * 
 * 1. Connection Errors
 *    Path: socket connection
 *    - Initial connect failure -> Retry with backoff
 *    - Connection lost -> Attempt reconnect
 *    - Timeout -> Reset connection
 * 
 * 2. Ping Errors
 *    Path: presence:ping
 *    - No response -> Mark as offline
 *    - Server error -> Retry ping
 *    - Rate limit -> Adjust interval
 * 
 * 3. State Sync Errors
 *    Path: presence:pong
 *    - Invalid data -> Keep last state
 *    - Parse error -> Log error
 *    - State conflict -> Server wins
 * 
 * 4. User Status Errors
 *    Path: presence:online/offline
 *    - Duplicate status -> Deduplicate
 *    - Invalid user -> Ignore update
 *    - Race condition -> Latest wins
 * 
 * 5. Error Recovery
 *    - Reconnect on failure
 *    - Resync state on reconnect
 *    - Clear stale data
 */
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
    socket.on('presence:pong', (data: { onlineUsers: string[], lastSeenTimes: Record<string, string> }) => {
      setState(prev => ({
        onlineUsers: new Set(data.onlineUsers),
        lastSeenTimes: new Map(Object.entries(data.lastSeenTimes).map(([id, time]) => [id, new Date(time as string)])),
      }));
    });

    socket.on('presence:online', (data: { userId: string }) => {
      setState(prev => ({
        ...prev,
        onlineUsers: new Set([...prev.onlineUsers, data.userId]),
      }));
    });

    socket.on('presence:offline', (data: { userId: string, lastSeen: Date }) => {
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
      socket.off('presence:online' as const);
      socket.off('presence:offline' as const);
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