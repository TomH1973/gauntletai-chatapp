import { mockUsers } from './users';

export interface MockThread {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
  participants: typeof mockUsers;
  unreadCount: number;
  isArchived: boolean;
  metadata?: Record<string, any>;
}

export const mockThreads: MockThread[] = [
  {
    id: 'thread-1',
    title: 'General Discussion',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastMessageAt: new Date('2024-01-01T00:00:00Z'),
    participants: mockUsers,
    unreadCount: 0,
    isArchived: false,
    metadata: {},
  },
  {
    id: 'thread-2',
    title: 'Project Updates',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastMessageAt: new Date('2024-01-01T00:00:00Z'),
    participants: [mockUsers[0], mockUsers[1]],
    unreadCount: 0,
    isArchived: false,
    metadata: {},
  },
]; 