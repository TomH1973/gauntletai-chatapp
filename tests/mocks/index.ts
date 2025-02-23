import { vi } from 'vitest';
import { EventEmitter } from 'events';

// Mock Redis class
export class MockRedis extends EventEmitter {
  get = vi.fn();
  set = vi.fn();
  setex = vi.fn();
  del = vi.fn();
  flushall = vi.fn();
  quit = vi.fn();
}

// Mock PrismaClient interface
export interface MockPrismaClient {
  $connect: ReturnType<typeof vi.fn>;
  $disconnect: ReturnType<typeof vi.fn>;
  message: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  thread: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  $queryRaw: ReturnType<typeof vi.fn>;
  $extends: ReturnType<typeof vi.fn>;
}

// Create mock PrismaClient instance
export const createMockPrismaClient = (): MockPrismaClient => {
  const instance: MockPrismaClient = {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    message: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      createMany: vi.fn(),
    },
    thread: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $extends: vi.fn().mockImplementation(function(this: MockPrismaClient, extensions: any) {
      return {
        ...this,
        ...extensions,
      };
    }),
  };
  return instance;
};

// Mock metrics
export const mockMetrics = {
  searchDuration: { observe: vi.fn() },
  searchCacheHits: { inc: vi.fn() },
  searchCacheMisses: { inc: vi.fn() },
  searchErrors: { inc: vi.fn() },
  get: vi.fn().mockReturnValue({ values: [{ value: 100 }] }),
}; 