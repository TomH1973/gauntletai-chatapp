import { Message as PrismaMessage, ThreadParticipant as PrismaThreadParticipant, User as PrismaUser, MessageStatus as PrismaMessageStatus } from '@prisma/client';

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

export type Message = PrismaMessage & {
  user: Pick<PrismaUser, 'id' | 'name' | 'image'>;
  tempId?: string;
  edits?: MessageEdit[];
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
  readBy?: Array<{ userId: string; readAt: Date }>;
  readAt?: Date | null;
};

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

export { PrismaMessageStatus as MessageStatus };

export interface ClientToServerEvents {
  'message:send': (data: {
    content: string;
    threadId: string;
    parentId?: string;
    tempId?: string;
  }) => void;
  'message:read': (messageId: string) => void;
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
  'message:new': (message: Message) => void;
  'message:status': (data: { messageId: string; status: PrismaMessageStatus }) => void;
  'thread:participantAdded': (participant: ThreadParticipant) => void;
  'thread:participantRemoved': (data: { threadId: string; userId: string }) => void;
  'thread:participantUpdated': (participant: ThreadParticipant) => void;
  'typing:update': (data: { threadId: string; users: Array<{ id: string; username: string }> }) => void;
  'error': (error: { code: string; message: string }) => void;
  'presence:online': (data: { userId: string; name: string | null }) => void;
  'presence:offline': (data: { userId: string; lastSeen: Date }) => void;
  'presence:pong': (data: { onlineUsers: string[]; lastSeenTimes: Record<string, Date> }) => void;
} 