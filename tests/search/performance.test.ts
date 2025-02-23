import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { v4 as uuidv4 } from 'uuid';
import { metrics } from '@/lib/metrics';

describe('Search Performance Tests', () => {
  const testUserId = uuidv4();
  const testThreadId = uuidv4();
  const messageCount = 10000;
  
  beforeAll(async () => {
    // Create test thread
    await prisma.thread.create({
      data: {
        id: testThreadId,
        name: 'Test Thread',
        participants: {
          create: {
            userId: testUserId,
            role: 'OWNER'
          }
        }
      }
    });

    // Create test messages
    const messages = Array.from({ length: messageCount }, (_, i) => ({
      id: uuidv4(),
      content: `Test message ${i} with some random words like performance optimization testing search functionality`,
      threadId: testThreadId,
      userId: testUserId
    }));

    await prisma.message.createMany({
      data: messages
    });

    // Wait for search vector updates
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    await prisma.message.deleteMany({
      where: { threadId: testThreadId }
    });
    await prisma.thread.delete({
      where: { id: testThreadId }
    });
    await redis.flushall();
  });

  it('should return search results within 500ms', async () => {
    const searchQueries = [
      'performance',
      'optimization',
      'test message',
      'functionality'
    ];

    const results = await Promise.all(
      searchQueries.map(async query => {
        const startTime = Date.now();
        
        const response = await fetch(`/api/messages/search?q=${encodeURIComponent(query)}&threadId=${testThreadId}`, {
          headers: {
            'Authorization': `Bearer test_token`,
            'X-Test-User-Id': testUserId
          }
        });

        const duration = Date.now() - startTime;
        return { query, duration, response };
      })
    );

    // Verify performance
    results.forEach(({ query, duration, response }) => {
      expect(duration).toBeLessThan(500, `Search for "${query}" took too long: ${duration}ms`);
      expect(response.ok).toBe(true);
    });

    // Check cache effectiveness
    const cacheHits = (await metrics.searchCacheHits.get()).values[0].value;
    const cacheMisses = (await metrics.searchCacheMisses.get()).values[0].value;
    const cacheHitRate = Number(cacheHits) / (Number(cacheHits) + Number(cacheMisses));
    
    expect(cacheHitRate).toBeGreaterThan(0.8, 'Cache hit rate should be above 80%');
  });

  it('should handle concurrent searches efficiently', async () => {
    const concurrentSearches = 10;
    const query = 'test message';

    const startTime = Date.now();
    
    const promises = Array.from({ length: concurrentSearches }, () =>
      fetch(`/api/messages/search?q=${encodeURIComponent(query)}&threadId=${testThreadId}`, {
        headers: {
          'Authorization': `Bearer test_token`,
          'X-Test-User-Id': testUserId
        }
      })
    );

    const responses = await Promise.all(promises);
    const duration = Date.now() - startTime;

    // Verify concurrent performance
    expect(duration / concurrentSearches).toBeLessThan(100, 
      `Average concurrent search time (${duration / concurrentSearches}ms) exceeds target`
    );

    responses.forEach(response => {
      expect(response.ok).toBe(true);
    });
  });

  it('should maintain performance with large result sets', async () => {
    const query = 'test'; // Will match most messages
    const startTime = Date.now();

    const response = await fetch(`/api/messages/search?q=${encodeURIComponent(query)}&threadId=${testThreadId}&limit=100`, {
      headers: {
        'Authorization': `Bearer test_token`,
        'X-Test-User-Id': testUserId
      }
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    expect(duration).toBeLessThan(500, 'Large result set search exceeded time limit');
    expect(data.messages.length).toBe(100);
    expect(data.pagination.total).toBeGreaterThan(1000);
  });
}); 