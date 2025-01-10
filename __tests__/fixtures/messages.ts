import { Message, MessageStatus } from '@/types';
import { testUsers } from './users';
import { testThreads } from './threads';

export const testMessages: Record<string, Message> = {
  aliceToBob: {
    id: 'message-1',
    content: 'Hey Bob, how are you?',
    threadId: testThreads.aliceBob.id,
    userId: testUsers.alice.id,
    createdAt: new Date('2024-01-09T12:00:00Z'),
    updatedAt: new Date('2024-01-09T12:00:00Z'),
    status: MessageStatus.DELIVERED,
    mentions: [],
    attachments: [],
    metadata: {},
    user: testUsers.alice
  },
  bobToAlice: {
    id: 'message-2',
    content: 'Hi Alice! I\'m doing great, thanks!',
    threadId: testThreads.aliceBob.id,
    userId: testUsers.bob.id,
    createdAt: new Date('2024-01-09T12:01:00Z'),
    updatedAt: new Date('2024-01-09T12:01:00Z'),
    status: MessageStatus.DELIVERED,
    mentions: [],
    attachments: [],
    metadata: {},
    user: testUsers.bob
  },
  aliceToGroup: {
    id: 'message-3',
    content: 'Welcome everyone to the team chat!',
    threadId: testThreads.groupChat.id,
    userId: testUsers.alice.id,
    createdAt: new Date('2024-01-09T11:00:00Z'),
    updatedAt: new Date('2024-01-09T11:00:00Z'),
    status: MessageStatus.DELIVERED,
    mentions: [testUsers.bob.id, testUsers.charlie.id],
    attachments: [],
    metadata: {},
    user: testUsers.alice
  }
}; 