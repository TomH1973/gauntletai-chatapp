import { test, expect } from '@playwright/test';
import { Manager } from 'socket.io-client';
import Redis from 'ioredis';
import { prisma } from '../../lib/prisma';
import { metrics } from '../../lib/metrics';
import { messageMetrics } from '../../lib/messageMetrics';
import { searchMetrics } from '../../lib/searchMetrics';
import { threadMetrics } from '../../lib/threadMetrics';
import { recoveryMetrics } from '../../lib/recoveryMetrics';
import { BATCH_SIZE } from '../../lib/handlers/websocket';

// Types
interface Message {
  content: string;
  timestamp: number;
  threadId?: string;
}

interface ThreadState {
  id: string;
  messages: Message[];
  participants: string[];
}

// Test configuration
const WS_URL = process.env.WS_URL || 'ws://localhost:3002';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Test utilities
const redis = new Redis(REDIS_URL);
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Create socket.io client
const createSocket = (auth = {}) => {
  const manager = new Manager(WS_URL, {
    auth
  });
  return manager.socket('/');
};

test.describe('Final QA Suite', () => {
  test.describe('Core Functionality', () => {
    test('WebSocket connection and authentication', async () => {
      const socket = createSocket({ userId: 'test-user' });
      
      const connected = await new Promise(resolve => {
        socket.on('connect', () => resolve(true));
        socket.on('connect_error', () => resolve(false));
      });
      
      expect(connected).toBe(true);
      expect(metrics.connections.get()).toBe(1);
      socket.close();
    });

    test('Message delivery within SLO', async () => {
      const socket = createSocket({ userId: 'test-user' });
      const messages: Message[] = [];
      const latencies: number[] = [];
      
      socket.on('message', (msg: Message) => {
        const latency = Date.now() - msg.timestamp;
        latencies.push(latency);
        messages.push(msg);
        messageMetrics.messageDeliveryTime.observe(latency / 1000);
      });

      // Send test messages
      for (let i = 0; i < 100; i++) {
        const timestamp = Date.now();
        socket.emit('message', {
          content: `Test message ${i}`,
          timestamp,
          threadId: 'test-thread'
        });
        await delay(50);
      }

      // Verify latencies
      const p95 = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
      expect(p95).toBeLessThan(150); // 150ms SLO
      expect(messageMetrics.messageQueueLength.get()).toBeLessThan(BATCH_SIZE);
      socket.close();
    });

    test('Connection recovery', async () => {
      const socket = createSocket({ userId: 'test-user' });
      let recoveryTime = 0;
      
      socket.on('disconnect', async () => {
        const start = Date.now();
        await new Promise(resolve => socket.on('connect', resolve));
        recoveryTime = Date.now() - start;
        recoveryMetrics.recoveryDuration.observe(recoveryTime / 1000);
      });

      await delay(1000);
      socket.disconnect();
      await delay(2000);
      
      expect(recoveryTime).toBeLessThan(2000); // 2s recovery SLO
      expect(recoveryMetrics.recoveryAttempts.get()).toBeGreaterThan(0);
      socket.close();
    });
  });

  test.describe('Performance Verification', () => {
    test('Search performance within SLO', async () => {
      const searchLatencies: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        const start = Date.now();
        await prisma.message.findMany({
          where: {
            content: { contains: 'test' }
          },
          take: 20
        });
        const latency = Date.now() - start;
        searchLatencies.push(latency);
        searchMetrics.searchTime.observe(latency / 1000);
      }

      const p95 = searchLatencies.sort((a, b) => a - b)[Math.floor(searchLatencies.length * 0.95)];
      expect(p95).toBeLessThan(750); // 750ms SLO
      expect(searchMetrics.searchErrors.get()).toBe(0);
    });

    test('Thread load performance within SLO', async () => {
      const loadLatencies: number[] = [];
      
      for (let i = 0; i < 50; i++) {
        const start = Date.now();
        await prisma.thread.findFirst({
          include: {
            messages: { take: 50 },
            participants: true
          }
        });
        const latency = Date.now() - start;
        loadLatencies.push(latency);
        threadMetrics.stateVerificationTime.observe(latency / 1000);
      }

      const p95 = loadLatencies.sort((a, b) => a - b)[Math.floor(loadLatencies.length * 0.95)];
      expect(p95).toBeLessThan(300); // 300ms SLO
      expect(threadMetrics.stateErrors.get()).toBe(0);
    });
  });

  test.describe('Resource Usage', () => {
    test('CPU usage within limits', async () => {
      const usage = await metrics.getCPUUsage();
      expect(usage).toBeLessThan(80); // 80% limit
    });

    test('Memory usage within limits', async () => {
      const usage = await metrics.getMemoryUsage();
      expect(usage).toBeLessThan(4 * 1024 * 1024 * 1024); // 4GB limit
    });

    test('Cache performance', async () => {
      const stats = await redis.info('stats');
      const hits = parseInt(stats.match(/keyspace_hits:(\d+)/)?.[1] || '0');
      const misses = parseInt(stats.match(/keyspace_misses:(\d+)/)?.[1] || '0');
      const missRate = misses / (hits + misses);
      
      expect(missRate).toBeLessThan(0.3); // 30% miss rate limit
    });
  });

  test.describe('Error Rates', () => {
    test('Error rate within SLO', async () => {
      const errorRate = await metrics.getErrorRate();
      expect(errorRate).toBeLessThan(0.005); // 0.5% error rate limit
      expect(metrics.errors.get()).toBe(0);
    });

    test('Connection drop rate within SLO', async () => {
      const dropRate = await metrics.getConnectionDropRate();
      expect(dropRate).toBeLessThan(0.01); // 1% drop rate limit
      expect(metrics.connectionDrops.get()).toBe(0);
    });
  });

  test.describe('Data Integrity', () => {
    test('Message persistence', async () => {
      const socket = createSocket({ userId: 'test-user' });
      const testMessage: Message = {
        content: `Test message ${Date.now()}`,
        threadId: 'test-thread',
        timestamp: Date.now()
      };
      
      socket.emit('message', testMessage);
      await delay(1000);
      
      const message = await prisma.message.findFirst({
        where: { content: testMessage.content }
      });
      
      expect(message).toBeTruthy();
      expect(message?.content).toBe(testMessage.content);
      socket.close();
    });

    test('State consistency after recovery', async () => {
      const socket = createSocket({ userId: 'test-user' });
      const states: ThreadState[] = [];
      
      socket.on('state', (state: ThreadState) => states.push(state));
      
      await delay(1000);
      socket.disconnect();
      await delay(1000);
      socket.connect();
      await delay(1000);
      
      expect(states.length).toBeGreaterThan(1);
      expect(states[states.length - 1]).toEqual(states[0]);
      expect(recoveryMetrics.recoveryHealth.get()).toBe(1);
      socket.close();
    });
  });
}); 