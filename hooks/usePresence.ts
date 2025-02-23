import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import type { UserStatus } from '@/lib/socket/presence';

/**
 * @interface PresenceState
 * @description State interface for tracking user presence information
 * 
 * @property {Set<string>} onlineUsers - Set of user IDs that are currently online
 * @property {Map<string, UserStatus>} userStatuses - Map of user IDs to their statuses
 * @property {Map<string, Date>} lastSeenTimes - Map of user IDs to their last seen timestamps
 */
interface PresenceState {
  onlineUsers: Set<string>;
  userStatuses: Map<string, UserStatus>;
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
 *    - User statuses
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
    userStatuses: new Map(),
    lastSeenTimes: new Map(),
  });

  // Track user activity
  const updateActivity = useCallback(() => {
    socket?.emit('presence:activity');
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    // Set up activity tracking
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove'];
    const activityHandler = () => {
      updateActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, activityHandler);
    });

    // Set up ping interval
    const pingInterval = setInterval(() => {
      socket.emit('presence:ping');
    }, 30000); // Every 30 seconds

    // Initial ping
    socket.emit('presence:ping');

    // Handle presence events
    socket.on('presence:pong', (data: { 
      onlineUsers: string[], 
      lastSeenTimes: Record<string, string>,
      userStatuses?: Record<string, UserStatus>
    }) => {
      setState(prev => ({
        onlineUsers: new Set(data.onlineUsers),
        userStatuses: new Map(
          Object.entries(data.userStatuses || {})
        ),
        lastSeenTimes: new Map(
          Object.entries(data.lastSeenTimes)
            .map(([id, time]) => [id, new Date(time)])
        ),
      }));
    });

    socket.on('presence:online', (data: { 
      userId: string, 
      status: UserStatus,
      lastSeen: string 
    }) => {
      setState(prev => {
        const newOnlineUsers = new Set(prev.onlineUsers).add(data.userId);
        const newUserStatuses = new Map(prev.userStatuses).set(data.userId, data.status);
        return {
          ...prev,
          onlineUsers: newOnlineUsers,
          userStatuses: newUserStatuses,
        };
      });
    });

    socket.on('presence:offline', (data: { 
      userId: string, 
      lastSeen: string 
    }) => {
      setState(prev => {
        const newOnlineUsers = new Set(prev.onlineUsers);
        newOnlineUsers.delete(data.userId);
        const newUserStatuses = new Map(prev.userStatuses).set(data.userId, 'OFFLINE');
        const newLastSeenTimes = new Map(prev.lastSeenTimes).set(
          data.userId, 
          new Date(data.lastSeen)
        );
        return {
          onlineUsers: newOnlineUsers,
          userStatuses: newUserStatuses,
          lastSeenTimes: newLastSeenTimes,
        };
      });
    });

    socket.on('presence:status', (data: {
      userId: string,
      status: UserStatus,
      lastSeen: string
    }) => {
      setState(prev => {
        const newUserStatuses = new Map(prev.userStatuses).set(data.userId, data.status);
        const newLastSeenTimes = new Map(prev.lastSeenTimes).set(
          data.userId,
          new Date(data.lastSeen)
        );
        return {
          ...prev,
          userStatuses: newUserStatuses,
          lastSeenTimes: newLastSeenTimes,
        };
      });
    });

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      events.forEach(event => {
        window.removeEventListener(event, activityHandler);
      });
      socket.off('presence:pong');
      socket.off('presence:online');
      socket.off('presence:offline');
      socket.off('presence:status');
    };
  }, [socket, updateActivity]);

  const isOnline = useCallback((userId: string) => 
    state.userStatuses.get(userId) === 'ONLINE', [state.userStatuses]);

  const getUserStatus = useCallback((userId: string) => 
    state.userStatuses.get(userId) || 'OFFLINE', [state.userStatuses]);

  const getLastSeen = useCallback((userId: string) => 
    state.lastSeenTimes.get(userId), [state.lastSeenTimes]);

  return {
    isOnline,
    getUserStatus,
    getLastSeen,
    onlineUsers: Array.from(state.onlineUsers),
  };
} 