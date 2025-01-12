export interface MockUser {
  id: string;
  name: string;
  username: string;
  email: string;
  clerkId: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date;
  isActive: boolean;
  metadata?: Record<string, any>;
}

export const mockUsers: MockUser[] = [
  {
    id: 'user-1',
    name: 'Alice Smith',
    username: 'alice',
    email: 'alice@example.com',
    clerkId: 'clerk_alice',
    imageUrl: 'https://example.com/alice.jpg',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    isActive: true,
    metadata: {},
  },
  {
    id: 'user-2',
    name: 'Bob Jones',
    username: 'bob',
    email: 'bob@example.com',
    clerkId: 'clerk_bob',
    imageUrl: 'https://example.com/bob.jpg',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    isActive: true,
    metadata: {},
  },
  {
    id: 'user-3',
    name: 'Carol Wilson',
    username: 'carol',
    email: 'carol@example.com',
    clerkId: 'clerk_carol',
    imageUrl: 'https://example.com/carol.jpg',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    lastLoginAt: new Date('2024-01-01T00:00:00Z'),
    isActive: true,
    metadata: {},
  },
]; 