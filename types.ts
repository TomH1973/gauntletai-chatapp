import type { Socket as ClientSocket } from 'socket.io-client';
import type { Socket as ServerSocket } from 'socket.io';

// Base Types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Message Status Types
export enum MessageStatus {
  SENDING = 'SENDING',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  ERROR = 'ERROR',
  FAILED = 'FAILED'
}

// Thread Role Types
export enum ThreadRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member'
}

// Socket Error Types
export enum SocketErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_REQUEST = 'INVALID_REQUEST',
  SERVER_ERROR = 'SERVER_ERROR'
}

export interface SocketError {
  code: SocketErrorCode;
  message: string;
}

// User Types
export interface User extends BaseEntity {
  email: string;
  username: string;
  clerkId?: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

// Message Types
export interface MessageEdit extends BaseEntity {
  content: string;
  editedBy: string;
  messageId: string;
}

export interface MessageReaction extends BaseEntity {
  emoji: string;
  userId: string;
  messageId: string;
  user: {
    id: string;
    username: string;
  };
}

export interface MessageAttachment extends BaseEntity {
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name: string;
  size: number;
  mimeType: string;
  messageId: string;
}

export interface Message extends BaseEntity {
  content: string;
  threadId: string;
  userId: string;
  status: MessageStatus;
  isEdited: boolean;
  error?: string;
  tempId?: string;
  edits: MessageEdit[];
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  user?: User;
  readBy: string[];
  readAt: Record<string, Date>;
}

export interface MessageWithUser extends Message {
  user: User;
}

// Thread Types
export interface ThreadParticipant extends BaseEntity {
  userId: string;
  threadId: string;
  joinedAt: Date;
  role: ThreadRole;
  canInvite: boolean;
  canRemove: boolean;
  user: User;
  lastReadAt: Date;
  isActive: boolean;
}

export interface Thread extends BaseEntity {
  title: string;
  lastMessageAt: Date;
  participants: ThreadParticipant[];
  messages: Message[];
  createdBy: string;
  updatedBy: string;
  isArchived: boolean;
  metadata: Record<string, unknown>;
}

// Socket Event Types
export interface ServerToClientEvents {
  'message:new': (message: Message) => void;
  'message:edited': (data: { messageId: string; content: string; editHistory: MessageEdit[] }) => void;
  'message:deleted': (messageId: string) => void;
  'message:reaction': (data: { messageId: string; reaction: MessageReaction }) => void;
  'message:reaction:removed': (data: { messageId: string; userId: string; emoji: string }) => void;
  'message:attachment_deleted': (data: { messageId: string; attachmentId: string }) => void;
  'thread:joined': (data: { threadId: string; userId: string }) => void;
  'thread:left': (data: { threadId: string; userId: string }) => void;
  'typing:update': (data: { userId: string; threadId: string; isTyping: boolean }) => void;
  'user:online': (userId: string) => void;
  'user:offline': (userId: string) => void;
  'error': (error: SocketError) => void;
}

export interface ClientToServerEvents {
  'message:send': (data: { content: string; threadId: string; tempId?: string; attachments?: File[] }) => void;
  'message:edit': (data: { messageId: string; content: string }) => void;
  'message:delete': (data: { messageId: string }) => void;
  'message:react': (data: { messageId: string; emoji: string }) => void;
  'message:react:remove': (data: { messageId: string; emoji: string }) => void;
  'message:delete_attachment': (data: { messageId: string; attachmentId: string }) => void;
  'thread:join': (data: { threadId: string }) => void;
  'thread:leave': (data: { threadId: string }) => void;
  'typing:start': (data: { threadId: string }) => void;
  'typing:stop': (data: { threadId: string }) => void;
}

// Socket Type
export type ChatSocket = {
  emit: <T extends keyof ClientToServerEvents>(
    event: T,
    ...args: Parameters<ClientToServerEvents[T]>
  ) => void;
  on: <T extends keyof ServerToClientEvents>(
    event: T,
    listener: ServerToClientEvents[T]
  ) => void;
  connect: () => void;
  disconnect: () => void;
  connected: boolean;
  id: string;
};

// Middleware Types
export interface AuthenticatedUser {
  id: string;
  username: string;
  email: string;
  profileImage?: string;
}

export interface SocketMiddlewareContext {
  user: AuthenticatedUser;
  currentThread?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface APIError {
  code: string;
  message: string;
  errors?: ValidationError[];
}

// Request/Response Types
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface ThreadCreateRequest {
  title: string;
  participantIds: string[];
}

export interface ThreadUpdateRequest {
  title?: string;
  participantIds?: string[];
}

export interface MessageCreateRequest {
  content: string;
  threadId: string;
  attachments?: File[];
}

export interface MessageUpdateRequest {
  content: string;
}

// File Handling Types
export interface FileUploadRequest {
  file: File;
  type: 'image' | 'video' | 'audio' | 'document';
  threadId: string;
  messageId?: string;
}

export interface FileUploadResponse {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'document';
  name: string;
  size: number;
  mimeType: string;
}

export interface FileDeleteRequest {
  fileId: string;
  threadId: string;
  messageId: string;
}

// Validation Types
export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export interface ValidationSchema<T> {
  [key: string]: ValidationRule<T[keyof T]>[];
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: Record<string, unknown>;
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
} 