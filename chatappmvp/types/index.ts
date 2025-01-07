export interface User {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

export interface Message {
  id: string;
  content: string;
  createdAt: string;
  threadId: string;
  user: User;
  parentId?: string;
}

export interface Thread {
  id: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  participants: User[];
} 