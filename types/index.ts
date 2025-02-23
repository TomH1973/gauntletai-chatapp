export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface Thread {
  id: string;
  title: string;
  name?: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  participants: User[];
  messages: Message[];
  isGroup: boolean;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string | Date;
  userId: string;
  user: User;
  threadId: string;
  parentId?: string;
  reactions?: MessageReaction[];
  attachments?: MessageAttachment[];
}

export interface Notification {
  id: string;
  userId: string;
  user: User;
  messageId: string;
  message: Message;
  read: boolean;
  createdAt: string;
}

export interface MessageReaction {
  id: string;
  type: string;
  userId: string;
  messageId: string;
  createdAt: Date;
  user: User;
}

export interface MessageAttachment {
  id: string;
  type: string;
  url: string;
  name: string;
  size: number;
  messageId: string;
  createdAt: Date;
}

export interface ThreadParticipant {
  userId: string;
  threadId: string;
  joinedAt: Date;
  leftAt?: Date;
  role: 'owner' | 'admin' | 'member';
  user: User;
  thread: Thread;
}

export interface SearchResult {
  messages: Message[];
  pagination: {
    total: number;
    pages: number;
    page: number;
    limit: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
} 