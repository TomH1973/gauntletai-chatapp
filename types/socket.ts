import { Server as SocketIOServer } from 'socket.io';
import { MessageStatus as PrismaMessageStatus } from '@prisma/client';

export type UserStatus = 'ONLINE' | 'AWAY' | 'OFFLINE';

export interface SocketData {
  userId: string;
  sessionId: string;
  threadIds: string[];
}

// Re-export Prisma enums
export { PrismaMessageStatus as MessageStatus };

export interface MessageEvent {
  threadId: string;
  content: string;
  tempId?: string;
  parentId?: string;
}

export interface MessageEditEvent {
  messageId: string;
  content: string;
}

export interface MessageDeleteEvent {
  messageId: string;
  threadId: string;
}

export interface MessageDeletedEvent {
  messageId: string;
  threadId: string;
  deletedAt: Date;
  deletedBy: {
    id: string;
    name: string;
  };
}

export interface TypingEvent {
  threadId: string;
  users: Array<{
    id: string;
    username: string;
  }>;
}

export interface PresenceEvent {
  userId: string;
  status: UserStatus;
  lastActivity: Date;
}

export interface PresenceData {
  onlineUsers: string[];
  userStatuses: Record<string, UserStatus>;
  lastSeenTimes: Record<string, Date>;
}

export interface MessageStatusEvent {
  messageId: string;
  status: PrismaMessageStatus;
  userId: string;
}

export interface MessageEditedEvent {
  messageId: string;
  content: string;
  editedAt: Date;
  editedBy: {
    id: string;
    name: string;
  };
}

export interface ThreadParticipantEvent {
  threadId: string;
  userId: string;
  role?: string;
  user?: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface ErrorEvent {
  code: SocketErrorCode;
  message: string;
  data?: any;
}

export interface MessageReactionEvent {
  messageId: string;
  emoji: string;
}

export interface MessageReactionAddedEvent {
  messageId: string;
  emoji: string;
  userId: string;
  user: {
    id: string;
    name: string;
  };
  createdAt: Date;
}

export interface MessageReactionRemovedEvent {
  messageId: string;
  emoji: string;
  userId: string;
}

export interface FileAttachmentEvent {
  messageId: string;
  files: Array<{
    id: string;
    name: string;
    type: FileType;
    size: number;
    mimeType: string;
    url: string;
  }>;
}

export interface FileAttachmentAddedEvent {
  messageId: string;
  attachment: {
    id: string;
    name: string;
    type: FileType;
    size: number;
    mimeType: string;
    url: string;
    uploadedBy: {
      id: string;
      name: string;
    };
  };
}

export interface FileAttachmentRemovedEvent {
  messageId: string;
  attachmentId: string;
  removedBy: {
    id: string;
    name: string;
  };
}

export interface ThreadCreateEvent {
  name: string;
  participants: Array<{
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
  }>;
}

export interface ThreadCreatedEvent {
  id: string;
  name: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
  };
  participants: Array<{
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    user: {
      id: string;
      name: string;
    };
  }>;
}

export interface ThreadParticipantAddEvent {
  threadId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface ThreadParticipantRemoveEvent {
  threadId: string;
  userId: string;
}

export interface ThreadParticipantUpdateEvent {
  threadId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
}

export interface ThreadSettingsUpdateEvent {
  threadId: string;
  settings: {
    isPrivate?: boolean;
    allowReactions?: boolean;
    allowReplies?: boolean;
    allowAttachments?: boolean;
  };
}

export interface ThreadSettingsUpdatedEvent {
  threadId: string;
  settings: {
    isPrivate: boolean;
    allowReactions: boolean;
    allowReplies: boolean;
    allowAttachments: boolean;
  };
  updatedBy: {
    id: string;
    name: string;
  };
  updatedAt: Date;
}

export interface MessageReactionData {
  messageId: string;
  reaction: string;
}

export interface ErrorResponse {
  code: string;
  message: string;
  details?: unknown;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  burstRemaining?: number;
  retryAfter?: number;
}

export enum SocketErrorCode {
  // Authentication Errors
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // User Errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_OFFLINE = 'USER_OFFLINE',
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Input Validation
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_OPERATION = 'INVALID_OPERATION',
  INVALID_FILE = 'INVALID_FILE',
  
  // Resource Errors
  THREAD_NOT_FOUND = 'THREAD_NOT_FOUND',
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  ATTACHMENT_NOT_FOUND = 'ATTACHMENT_NOT_FOUND',
  THREAD_ACCESS_DENIED = 'THREAD_ACCESS_DENIED',
  
  // Operation Errors
  OPERATION_FAILED = 'OPERATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  MESSAGE_ERROR = 'MESSAGE_ERROR',
  
  // System Errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE'
}

export interface ServerToClientEvents {
  'error': (error: ErrorEvent) => void;
  'message:new': (message: Message) => void;
  'message:edited': (message: Message) => void;
  'message:deleted': (message: Message) => void;
  'message:status': (data: MessageStatusEvent) => void;
  'message:updated': (message: Message) => void;
  'message:reactionAdded': (data: MessageReactionAddedEvent) => void;
  'message:reactionRemoved': (data: MessageReactionRemovedEvent) => void;
  'message:attachmentAdded': (data: FileAttachmentAddedEvent) => void;
  'message:attachmentRemoved': (data: FileAttachmentRemovedEvent) => void;
  'presence:online': (data: { userId: string; name: string }) => void;
  'presence:offline': (data: { userId: string; lastSeen?: string }) => void;
  'presence:pong': (data: PresenceData) => void;
  'typing:update': (data: TypingEvent) => void;
  'thread:updated': (thread: Thread) => void;
  'thread:created': (thread: ThreadCreatedEvent) => void;
  'thread:participantAdded': (data: ThreadParticipantEvent) => void;
  'thread:participantRemoved': (data: ThreadParticipantEvent) => void;
  'thread:participantUpdated': (data: ThreadParticipantEvent) => void;
  'thread:settingsUpdated': (data: ThreadSettingsUpdatedEvent) => void;
  'message:received': (message: MessageEvent & { id: string; sender: { id: string; name: string } }) => void;
  'message:edited': (event: MessageEditEvent & { editedBy: { id: string; name: string } }) => void;
  'message:deleted': (event: MessageDeletedEvent) => void;
  'typing:update': (event: TypingEvent) => void;
  'presence:update': (event: PresenceEvent) => void;
  'thread:joined': (threadId: string) => void;
  'thread:left': (threadId: string) => void;
}

export interface ClientToServerEvents {
  'message:send': (event: MessageEvent) => void;
  'message:edit': (event: MessageEditEvent) => void;
  'message:delete': (event: MessageDeleteEvent) => void;
  'typing:start': (threadId: string) => void;
  'typing:stop': (threadId: string) => void;
  'presence:update': (status: UserStatus) => void;
  'thread:join': (threadId: string) => void;
  'thread:leave': (threadId: string) => void;
  'message:addReaction': (data: MessageReactionEvent) => void;
  'message:removeReaction': (data: MessageReactionEvent) => void;
  'message:read': (messageId: string) => void;
  'message:addAttachment': (data: FileAttachmentEvent) => void;
  'message:removeAttachment': (data: { messageId: string; attachmentId: string }) => void;
  'thread:create': (data: ThreadCreateEvent) => void;
  'thread:addParticipant': (data: ThreadParticipantAddEvent) => void;
  'thread:removeParticipant': (data: ThreadParticipantRemoveEvent) => void;
  'thread:updateParticipant': (data: ThreadParticipantUpdateEvent) => void;
  'thread:updateSettings': (data: ThreadSettingsUpdateEvent) => void;
  'presence:ping': () => void;
}

export interface Message {
  id: string;
  content: string;
  userId: string;
  threadId: string;
  parentId: string | null;
  status: PrismaMessageStatus;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    image?: string;
  };
  parent?: Message;
  tempId?: string;
}

export interface Thread {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date | null;
  participants: ThreadParticipant[];
  settings?: ThreadSettings;
}

export interface ThreadParticipant {
  id: string;
  userId: string;
  threadId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  user: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface ThreadSettings {
  isPrivate: boolean;
  allowReactions: boolean;
  allowReplies: boolean;
  allowAttachments: boolean;
}

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  messageId: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
  };
}

export interface FileAttachment {
  id: string;
  filename: string;
  key: string;
  url: string;
  size: number;
  mimeType: string;
  fileType: FileType;
  isPublic: boolean;
  isDeleted: boolean;
  messageId: string | null;
  uploaderId: string;
  uploader: {
    id: string;
    name: string;
  };
}

export type SocketServer = SocketIOServer<
  ClientToServerEvents,
  ServerToClientEvents,
  {},
  SocketData
>; 