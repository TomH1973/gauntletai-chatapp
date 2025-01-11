import { Message as PrismaMessage, ThreadParticipant as PrismaThreadParticipant, User as PrismaUser, MessageStatus } from '@prisma/client';

export { MessageStatus };

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  messageId: string;
}

export interface MessageEdit {
  id: string;
  content: string;
  editedAt: Date;
  editedBy: string;
}

export interface MessageAttachment {
  id: string;
  url: string;
  type: string;
  name: string;
  size: number;
}

export interface Message {
  id: string;
  content: string;
  threadId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string | null;
  user: {
    id: string;
    name: string;
    image: string;
  };
  replies?: Message[];
  reactions?: MessageReaction[];
  readBy?: Array<{ userId: string; readAt: Date }>;
  status: MessageStatus;
}

export type Thread = {
  id: string;
  name?: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: ThreadParticipant[];
};

export type User = Pick<PrismaUser, 'id' | 'name' | 'image' | 'email'>;

export type ThreadParticipant = PrismaThreadParticipant & {
  user: Pick<PrismaUser, 'id' | 'name' | 'image'>;
};

export interface ClientToServerEvents {
  'message:send': (data: {
    content: string;
    threadId: string;
    parentId?: string;
    tempId?: string;
  }) => void;
  'message:read': (messageId: string) => void;
  'message:react': (data: { messageId: string; emoji: string }) => void;
  'message:react:remove': (data: { messageId: string; emoji: string }) => void;
  'thread:join': (threadId: string) => void;
  'thread:leave': (threadId: string) => void;
  'typing:start': (threadId: string) => void;
  'typing:stop': (threadId: string) => void;
  'presence:ping': () => void;
}

export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:updated': (message: Message) => void;
  'message:reaction': (data: { messageId: string; reaction: MessageReaction }) => void;
  'message:reaction:removed': (data: { messageId: string; reaction: MessageReaction }) => void;
  'thread:updated': (thread: Thread) => void;
  'typing:update': (data: { threadId: string; userId: string; isTyping: boolean }) => void;
  'presence:update': (data: { userId: string; isOnline: boolean; lastSeen?: string }) => void;
  'presence:pong': (data: { onlineUsers: string[]; lastSeenTimes: Record<string, string> }) => void;
  'presence:online': (data: { userId: string }) => void;
  'presence:offline': (data: { userId: string; lastSeen: Date }) => void;
  'error': (error: { code: string; message: string }) => void;
} 