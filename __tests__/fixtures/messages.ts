import { mockUsers } from './users';

export interface MockMessage {
  id: string;
  content: string;
  threadId: string;
  userId: string;
  user: typeof mockUsers[0];
  createdAt: Date;
  updatedAt: Date;
  status: 'SENT' | 'DELIVERED' | 'READ';
  mentions: string[];
  attachments: any[];
  reactions?: MockReaction[];
  metadata?: Record<string, any>;
  parentId?: string;
  parent?: MockMessage;
}

export interface MockReaction {
  id: string;
  emoji: string;
  messageId: string;
  userId: string;
  user: typeof mockUsers[0];
  createdAt: Date;
}

export const mockMessages: MockMessage[] = [
  {
    id: 'message-1',
    content: 'Hello everyone!',
    threadId: 'thread-1',
    userId: mockUsers[0].id,
    user: mockUsers[0],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    status: 'DELIVERED',
    mentions: [],
    attachments: [],
    metadata: {},
    reactions: [
      {
        id: 'reaction-1',
        emoji: '👋',
        messageId: 'message-1',
        userId: mockUsers[1].id,
        user: mockUsers[1],
        createdAt: new Date('2024-01-01T00:00:01Z'),
      }
    ]
  },
  {
    id: 'message-2',
    content: 'Hi Alice!',
    threadId: 'thread-1',
    userId: mockUsers[1].id,
    user: mockUsers[1],
    createdAt: new Date('2024-01-01T00:00:02Z'),
    updatedAt: new Date('2024-01-01T00:00:02Z'),
    status: 'DELIVERED',
    mentions: [],
    attachments: [],
    metadata: {},
  },
  {
    id: 'message-3',
    content: 'Project update: Phase 1 complete',
    threadId: 'thread-2',
    userId: mockUsers[0].id,
    user: mockUsers[0],
    createdAt: new Date('2024-01-01T00:00:03Z'),
    updatedAt: new Date('2024-01-01T00:00:03Z'),
    status: 'DELIVERED',
    mentions: [],
    attachments: [],
    metadata: {},
  },
]; 