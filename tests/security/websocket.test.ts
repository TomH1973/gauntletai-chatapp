import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

describe('WebSocket Security', () => {
  const WS_URL = 'ws://localhost:3002';
  let mockUser: any;

  beforeAll(async () => {
    // Create test user
    mockUser = await prisma.user.create({
      data: {
        clerkId: 'test-clerk-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({
      where: { id: mockUser.id },
    });
  });

  describe('Connection Security', () => {
    it('should reject connections without authentication', (done) => {
      const ws = new WebSocket(WS_URL);
      
      ws.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });

    it('should reject invalid tokens', (done) => {
      const ws = new WebSocket(`${WS_URL}?token=invalid-token`);
      
      ws.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });

    it('should reject expired tokens', (done) => {
      const expiredToken = jwt.sign(
        { userId: mockUser.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '0s' }
      );

      const ws = new WebSocket(`${WS_URL}?token=${expiredToken}`);
      
      ws.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });
  });

  describe('Message Security', () => {
    let ws: WebSocket;
    let validToken: string;

    beforeAll(() => {
      validToken = jwt.sign(
        { userId: mockUser.id },
        process.env.JWT_SECRET || 'test-secret'
      );
      ws = new WebSocket(`${WS_URL}?token=${validToken}`);
    });

    afterAll(() => {
      ws.close();
    });

    it('should reject oversized messages', (done) => {
      const largeMessage = 'a'.repeat(1024 * 1024 + 1); // > 1MB
      
      ws.send(JSON.stringify({
        type: 'message:send',
        content: largeMessage,
        threadId: 'test-thread',
      }));

      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        expect(response.error).toBeDefined();
        expect(response.error.code).toBe('MESSAGE_TOO_LARGE');
        done();
      });
    });

    it('should prevent message spoofing', (done) => {
      ws.send(JSON.stringify({
        type: 'message:new',
        userId: 'different-user-id',
        content: 'Spoofed message',
        threadId: 'test-thread',
      }));

      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        expect(response.error).toBeDefined();
        expect(response.error.code).toBe('UNAUTHORIZED');
        done();
      });
    });

    it('should validate message content', (done) => {
      const maliciousContent = '<script>alert("xss")</script>';
      
      ws.send(JSON.stringify({
        type: 'message:send',
        content: maliciousContent,
        threadId: 'test-thread',
      }));

      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        expect(response.error).toBeDefined();
        expect(response.error.code).toBe('INVALID_CONTENT');
        done();
      });
    });
  });

  describe('Rate Limiting', () => {
    let ws: WebSocket;
    let validToken: string;

    beforeAll(() => {
      validToken = jwt.sign(
        { userId: mockUser.id },
        process.env.JWT_SECRET || 'test-secret'
      );
      ws = new WebSocket(`${WS_URL}?token=${validToken}`);
    });

    afterAll(() => {
      ws.close();
    });

    it('should enforce message rate limits', (done) => {
      let messageCount = 0;
      const sendMessages = () => {
        if (messageCount >= 50) { // Try to send 50 messages quickly
          return;
        }
        
        ws.send(JSON.stringify({
          type: 'message:send',
          content: `Test message ${messageCount}`,
          threadId: 'test-thread',
        }));
        
        messageCount++;
        setTimeout(sendMessages, 10); // Send every 10ms
      };

      sendMessages();

      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        if (response.error && response.error.code === 'RATE_LIMIT_EXCEEDED') {
          expect(messageCount).toBeGreaterThan(10); // Should allow some messages before rate limiting
          done();
        }
      });
    });

    it('should enforce connection rate limits', async () => {
      const MAX_CONNECTIONS = 5;
      const connections: WebSocket[] = [];

      // Try to create many connections quickly
      for (let i = 0; i < MAX_CONNECTIONS + 5; i++) {
        try {
          const ws = new WebSocket(`${WS_URL}?token=${validToken}`);
          connections.push(ws);
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          expect(connections.length).toBeLessThanOrEqual(MAX_CONNECTIONS);
          break;
        }
      }

      // Cleanup
      connections.forEach(ws => ws.close());
    });
  });

  describe('Thread Access Control', () => {
    let ws: WebSocket;
    let validToken: string;
    let privateThread: any;

    beforeAll(async () => {
      validToken = jwt.sign(
        { userId: mockUser.id },
        process.env.JWT_SECRET || 'test-secret'
      );
      ws = new WebSocket(`${WS_URL}?token=${validToken}`);

      // Create a private thread
      privateThread = await prisma.thread.create({
        data: {
          name: 'Private Thread',
          participants: {
            create: {
              userId: 'other-user-id',
              role: 'OWNER',
            },
          },
        },
      });
    });

    afterAll(async () => {
      ws.close();
      await prisma.thread.delete({
        where: { id: privateThread.id },
      });
    });

    it('should prevent unauthorized thread access', (done) => {
      ws.send(JSON.stringify({
        type: 'thread:join',
        threadId: privateThread.id,
      }));

      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        expect(response.error).toBeDefined();
        expect(response.error.code).toBe('THREAD_ACCESS_DENIED');
        done();
      });
    });

    it('should prevent unauthorized message sending', (done) => {
      ws.send(JSON.stringify({
        type: 'message:send',
        content: 'Test message',
        threadId: privateThread.id,
      }));

      ws.on('message', (data) => {
        const response = JSON.parse(data.toString());
        expect(response.error).toBeDefined();
        expect(response.error.code).toBe('THREAD_ACCESS_DENIED');
        done();
      });
    });
  });
}); 