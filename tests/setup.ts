import { beforeAll, afterAll, vi } from 'vitest';
import { MockRedis, createMockPrismaClient, mockMetrics } from './mocks';

// Mock Redis
vi.mock('ioredis', () => ({
  default: MockRedis
}));

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => createMockPrismaClient()),
}));

// Mock metrics
vi.mock('@/lib/metrics', () => ({
  metrics: mockMetrics,
}));

// Mock fetch for API calls
global.fetch = vi.fn();

beforeAll(() => {
  // Reset all mocks before each test
  vi.clearAllMocks();
});

afterAll(() => {
  vi.resetAllMocks();
}); 