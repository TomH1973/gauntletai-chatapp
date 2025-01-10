import { User } from '@/types';

export const testUsers: Record<string, User> = {
  alice: {
    id: 'user-alice-id',
    username: 'Alice Smith',
    email: 'alice@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    imageUrl: 'https://example.com/alice.jpg',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-01-09T12:00:00Z'),
    isActive: true
  },
  bob: {
    id: 'user-bob-id',
    username: 'Bob Jones',
    email: 'bob@example.com',
    firstName: 'Bob',
    lastName: 'Jones',
    imageUrl: 'https://example.com/bob.jpg',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-01-09T11:00:00Z'),
    isActive: true
  },
  charlie: {
    id: 'user-charlie-id',
    username: 'Charlie Brown',
    email: 'charlie@example.com',
    firstName: 'Charlie',
    lastName: 'Brown',
    imageUrl: 'https://example.com/charlie.jpg',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-01-09T10:00:00Z'),
    isActive: true
  }
}; 