import { Socket } from 'socket.io';
import { User } from '@prisma/client';

export interface SocketData {
  user: {
    id: string;
    email: string;
    username: string;
  };
  rateLimiter?: {
    [key: string]: number;
  };
}

export interface AuthenticatedSocket extends Socket {
  data: SocketData;
}

export interface ServerToClientEvents {
  error: (error: { code: string; message: string; data?: any }) => void;
  message_received: (message: any) => void;
  message_delivered: (data: { messageId: string; threadId: string }) => void;
  message_delivery_failed: (data: { messageId: string; undelivered: string[] }) => void;
  user_online: (userId: string) => void;
  user_offline: (userId: string) => void;
  typing_start: (data: { userId: string; threadId: string }) => void;
  typing_end: (data: { userId: string; threadId: string }) => void;
  notification_received: (data: { type: string; messageId: string; threadId: string }) => void;
}

export interface ClientToServerEvents {
  join_thread: (threadId: string) => void;
  leave_thread: (threadId: string) => void;
  new_message: (data: { threadId: string; content: string; parentId?: string }) => void;
  typing_start: (threadId: string) => void;
  typing_end: (threadId: string) => void;
  message_delivered: (messageId: string) => void;
} 