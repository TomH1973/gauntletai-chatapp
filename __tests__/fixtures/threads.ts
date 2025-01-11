import { Thread } from '@/types';
import { testUsers } from './users';

export const testThreads: Record<string, Thread> = {
  aliceBob: {
    id: 'thread-alice-bob-id',
    name: 'Alice & Bob Chat',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-09T12:00:00Z'),
    lastMessageAt: new Date('2024-01-09T12:00:00Z'),
    isArchived: false,
    participantIds: [testUsers.alice.id, testUsers.bob.id],
    participants: [{
      ...testUsers.alice,
      role: 'member'
    }, {
      ...testUsers.bob,
      role: 'member'
    }],
    messages: [],
    metadata: {},
    unreadCount: 0,
    isGroup: false,
    createdBy: testUsers.alice.id
  },
  groupChat: {
    id: 'thread-group-id',
    name: 'Team Chat',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-09T11:00:00Z'),
    lastMessageAt: new Date('2024-01-09T11:00:00Z'),
    isArchived: false,
    participantIds: [testUsers.alice.id, testUsers.bob.id, testUsers.charlie.id],
    participants: [{
      ...testUsers.alice,
      role: 'admin'
    }, {
      ...testUsers.bob,
      role: 'member'
    }, {
      ...testUsers.charlie, 
      role: 'participant'
    }],
    messages: [],
    metadata: {},
    unreadCount: 0,
    isGroup: true,
    createdBy: testUsers.alice.id
  }
}; 