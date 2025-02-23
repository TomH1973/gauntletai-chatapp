import { vi } from 'vitest';
import type { Message, Thread, Prisma, MessageStatus } from '@prisma/client';
import { EventEmitter } from 'events';

const createMockMessage = (data: Partial<Message>): Message => ({
  id: 'mock-id',
  content: 'mock content',
  userId: 'mock-user-id',
  threadId: 'mock-thread-id',
  parentId: null,
  status: 'ACTIVE' as MessageStatus,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...data
});

const createMockThread = (data: Partial<Thread>): Thread => ({
  id: 'mock-thread-id',
  name: 'mock thread',
  createdAt: new Date(),
  updatedAt: new Date(),
  lastMessageAt: null,
  ...data
});

export const createMockPrismaClient = () => ({
  $connect: vi.fn(),
  $disconnect: vi.fn(),
  $extends: vi.fn().mockImplementation(function(this: any, extensions: any) {
    return { ...this, ...extensions };
  }),
  message: {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async ({ data }: { data: Prisma.MessageCreateInput }) => 
      createMockMessage({
        content: data.content as string,
        ...(data as Partial<Message>)
      })
    ),
    update: vi.fn().mockImplementation(async ({ data, where }: { data: Prisma.MessageUpdateInput, where: Prisma.MessageWhereUniqueInput }) => 
      createMockMessage({
        ...(where as Partial<Message>),
        ...(data as Partial<Message>)
      })
    ),
    delete: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 })
  },
  thread: {
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async ({ data }: { data: Prisma.ThreadCreateInput }) => 
      createMockThread({
        ...(data as Partial<Thread>)
      })
    ),
    update: vi.fn().mockImplementation(async ({ data, where }: { data: Prisma.ThreadUpdateInput, where: Prisma.ThreadWhereUniqueInput }) => 
      createMockThread({
        ...(where as Partial<Thread>),
        ...(data as Partial<Thread>)
      })
    ),
    delete: vi.fn().mockResolvedValue(null),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 })
  }
});

// Mock fetch to return proper Response objects
vi.mock('node-fetch', () => ({
  default: vi.fn().mockImplementation(() => 
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ 
        results: [],
        total: 0,
        page: 1,
        pageSize: 10
      })
    })
  )
}));

// Mock Redis class
class MockRedis extends EventEmitter {
  private store: Map<string, string>;

  constructor() {
    super();
    this.store = new Map();
  }

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string) {
    this.store.set(key, value);
    setTimeout(() => this.store.delete(key), seconds * 1000);
    return 'OK';
  }

  async del(key: string) {
    return this.store.delete(key) ? 1 : 0;
  }

  async flushall() {
    this.store.clear();
    return 'OK';
  }

  quit() {
    return Promise.resolve('OK');
  }
}

// Mock ioredis
vi.mock('ioredis', () => ({
  default: MockRedis
})); 