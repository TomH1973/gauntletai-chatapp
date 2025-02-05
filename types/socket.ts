import { Message, Thread, User } from '@prisma/client';
import type { MessageReaction } from './chat';

export interface SocketData {
  userId: string;
  sessionId: string;
  threadIds: string[];
}

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
  name: string;
  lastSeen?: Date;
}

export interface MessageStatusEvent {
  messageId: string;
  status: 'SENT' | 'DELIVERED' | 'READ' | 'ERROR';
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
  code: string;
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
    type: 'image' | 'video' | 'audio' | 'document';
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
    type: 'image' | 'video' | 'audio' | 'document';
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
  title: string;
  participants: Array<{
    userId: string;
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
  }>;
}

export interface ThreadCreatedEvent {
  id: string;
  title: string;
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
    title?: string;
    isPrivate?: boolean;
    allowInvites?: boolean;
    allowReactions?: boolean;
    allowThreading?: boolean;
    allowAttachments?: boolean;
    retentionDays?: number;
  };
}

export interface ThreadSettingsUpdatedEvent {
  threadId: string;
  settings: {
    title: string;
    isPrivate: boolean;
    allowInvites: boolean;
    allowReactions: boolean;
    allowThreading: boolean;
    allowAttachments: boolean;
    retentionDays: number;
  };
  updatedBy: {
    id: string;
    name: string;
  };
  updatedAt: Date;
}

export interface ServerToClientEvents {
  'error': (error: ErrorEvent) => void;
  'message:new': (message: Message & { user: Partial<User>; tempId?: string }) => void;
  'message:edited': (data: MessageEditedEvent) => void;
  'message:deleted': (data: MessageDeletedEvent) => void;
  'message:status': (data: MessageStatusEvent) => void;
  'message:reactionAdded': (data: MessageReactionAddedEvent) => void;
  'message:reactionRemoved': (data: MessageReactionRemovedEvent) => void;
  'presence:online': (data: PresenceEvent) => void;
  'presence:offline': (data: PresenceEvent) => void;
  'presence:pong': (data: { onlineUsers: string[]; lastSeenTimes: Record<string, Date> }) => void;
  'typing:update': (data: TypingEvent) => void;
  'thread:participantAdded': (data: ThreadParticipantEvent) => void;
  'thread:participantRemoved': (data: ThreadParticipantEvent) => void;
  'thread:participantUpdated': (data: ThreadParticipantEvent) => void;
  'message:attachmentAdded': (data: FileAttachmentAddedEvent) => void;
  'message:attachmentRemoved': (data: FileAttachmentRemovedEvent) => void;
  'thread:created': (data: ThreadCreatedEvent) => void;
  'thread:settingsUpdated': (data: ThreadSettingsUpdatedEvent) => void;
  'message:reactionUpdated': (data: { messageId: string; reactions: MessageReaction[] }) => void;
  'thread:joined': (threadId: string) => void;
  'thread:left': (threadId: string) => void;
  'typing:started': (data: { threadId: string; userId: string }) => void;
  'typing:stopped': (data: { threadId: string; userId: string }) => void;
}

export interface ClientToServerEvents {
  'presence:ping': () => void;
  'message:send': (data: {
    content: string;
    threadId: string;
    parentId?: string;
    tempId?: string;
  }) => void;
  'message:edit': (data: {
    messageId: string;
    content: string;
  }) => void;
  'message:delete': (messageId: string) => void;
  'message:read': (messageId: string) => void;
  'message:react': (data: { messageId: string; emoji: string }) => void;
  'typing:start': (threadId: string) => void;
  'typing:stop': (threadId: string) => void;
  'thread:join': (threadId: string) => void;
  'thread:leave': (threadId: string) => void;
  'thread:participantAdded': (data: ThreadParticipantEvent) => void;
  'thread:participantRemoved': (data: ThreadParticipantEvent) => void;
  'thread:participantUpdated': (data: ThreadParticipantEvent) => void;
  'message:addAttachment': (data: FileAttachmentEvent) => void;
  'message:removeAttachment': (data: { messageId: string; attachmentId: string }) => void;
  'thread:create': (data: ThreadCreateEvent) => void;
  'thread:addParticipant': (data: ThreadParticipantAddEvent) => void;
  'thread:removeParticipant': (data: ThreadParticipantRemoveEvent) => void;
  'thread:updateParticipant': (data: ThreadParticipantUpdateEvent) => void;
  'thread:updateSettings': (data: ThreadSettingsUpdateEvent) => void;
}

export enum SocketErrorCode {
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',
  THREAD_NOT_FOUND = 'THREAD_NOT_FOUND',
  THREAD_ACCESS_DENIED = 'THREAD_ACCESS_DENIED',
  REACTION_FAILED = 'REACTION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_OPERATION = 'INVALID_OPERATION',
  INTERNAL_ERROR = 'INTERNAL_ERROR'
} 