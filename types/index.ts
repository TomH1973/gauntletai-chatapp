export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  profileImage: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
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
  title: string | null;
  createdAt: string;
  updatedAt: string;
  participants: User[];
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: User;
  threadId: string;
  thread: Thread;
  parentId: string | null;
  parent?: Message;
  replies: Message[];
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

export type ApiResponse<T> = {
  data?: T;
  error?: string;
  status: number;
}; 