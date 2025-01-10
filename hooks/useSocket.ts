import { useEffect, useState, useCallback } from 'react';
import { Manager } from 'socket.io-client';
import type { Socket } from 'socket.io-client/build/esm/socket';
import type { ClientToServerEvents, ServerToClientEvents } from '@/types/chat';
import { useAuth } from '@/contexts/auth-context';

/** Type for socket instance with auth and event types */
type SocketWithAuth = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * @constant SOCKET_URL - WebSocket server URL
 * @constant RECONNECTION_ATTEMPTS - Maximum number of reconnection attempts
 * @constant RECONNECTION_DELAY - Delay between reconnection attempts in ms
 */
const SOCKET_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
const RECONNECTION_ATTEMPTS = 5;
const RECONNECTION_DELAY = 1000;

/**
 * @hook useSocket
 * @description Custom hook for managing WebSocket connections with authentication and reconnection support
 * 
 * @returns {Object} Socket state and control functions
 * @property {SocketWithAuth | null} socket - The socket instance
 * @property {boolean} isConnected - Whether the socket is currently connected
 * @property {Error | null} error - Any connection error that occurred
 * @property {() => void} reconnect - Function to manually trigger reconnection
 * 
 * @example
 * ```tsx
 * const { socket, isConnected, error, reconnect } = useSocket();
 * 
 * useEffect(() => {
 *   if (socket) {
 *     socket.on('message:new', handleNewMessage);
 *   }
 * }, [socket]);
 * ```
 */
export function useSocket() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<SocketWithAuth | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const connect = useCallback(() => {
    if (!user) return;

    const manager = new Manager(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: RECONNECTION_ATTEMPTS,
      reconnectionDelay: RECONNECTION_DELAY,
    });

    const newSocket = manager.socket('/') as unknown as SocketWithAuth;
    newSocket.auth = { userId: user.id };

    newSocket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err: Error) => {
      setError(err);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
      setError(null);
    };
  }, [user]);

  useEffect(() => {
    const cleanup = connect();
    return () => {
      cleanup?.();
    };
  }, [connect]);

  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    connect();
  }, [socket, connect]);

  return {
    socket,
    isConnected,
    error,
    reconnect
  };
} 