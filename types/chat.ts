import { Message as PrismaMessage, ThreadParticipant as PrismaThreadParticipant, User as PrismaUser, MessageStatus } from '@prisma/client';

export { MessageStatus };

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
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

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  sender: User;
  threadId: string;
  parentId?: string;
  attachments?: {
    id: string;
    url: string;
    type: string;
    name: string;
  }[];
}

export interface Thread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  participants: User[];
  lastMessage?: Message;
}

export interface MessageError {
  code: string;
  message: string;
  details?: any;
}

export type ThreadParticipant = PrismaThreadParticipant & {
  user: User;
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
  'thread:participantAdded': (data: { threadId: string; userId: string }) => void;
  'thread:participantRemoved': (data: { threadId: string; userId: string }) => void;
  'thread:participantUpdated': (data: { threadId: string; userId: string }) => void;
  'typing:start': (threadId: string) => void;
  'typing:stop': (threadId: string) => void;
  'presence:ping': () => void;
}

export interface ServerToClientEvents {
  'message:new': (message: Message & { tempId?: string }) => void;
  'message:updated': (message: Message) => void;
  'message:status': (data: { messageId: string; status: MessageStatus }) => void;
  'message:reaction': (data: { messageId: string; reaction: MessageReaction }) => void;
  'message:reaction:removed': (data: { messageId: string; reaction: MessageReaction }) => void;
  'thread:updated': (thread: Thread) => void;
  'thread:participantAdded': (participant: ThreadParticipant) => void;
  'thread:participantRemoved': (data: { threadId: string; userId: string }) => void;
  'thread:participantUpdated': (participant: ThreadParticipant) => void;
  'typing:update': (data: { threadId: string; userId: string; isTyping: boolean }) => void;
  'presence:update': (data: { userId: string; isOnline: boolean; lastSeen?: string }) => void;
  'presence:pong': (data: { onlineUsers: string[]; lastSeenTimes: Record<string, string> }) => void;
  'presence:online': (data: { userId: string }) => void;
  'presence:offline': (data: { userId: string; lastSeen: Date }) => void;
  'error': (error: { code: string; message: string }) => void;
} 