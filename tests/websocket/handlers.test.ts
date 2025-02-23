import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { WebSocket, Server } from 'ws';
import { createServer } from 'http';
import { threadManager } from '../../lib/thread/threadManager';
import { rateLimiter } from '../../lib/security/rateLimiter';
import { e2ee } from '../../lib/encryption/e2ee';
import { errorRecovery } from '../../lib/error/errorRecovery';
import { v4 as uuidv4 } from 'uuid';
import { wsRateLimiter } from '../../lib/rate-limit/websocket';

describe('WebSocket Handlers', () => {
  let server: Server;
  let wsUrl: string;
  let mockUserId: string;

  beforeEach(async () => {
    const httpServer = createServer();
    server = new Server({ server: httpServer });
    
    // Start server on random port
    await new Promise<void>(resolve => {
      httpServer.listen(0, 'localhost', () => {
        const address = httpServer.address();
        if (address && typeof address !== 'string') {
          wsUrl = `ws://localhost:${address.port}`;
        }
        resolve();
      });
    });

    mockUserId = uuidv4();
    await e2ee.initializeUser(mockUserId);
  });

  afterEach(async () => {
    server.close();
    await e2ee.cleanup();
  });

  describe('Message Handling', () => {
    it('should handle message send and delivery', async () => {
      const ws1 = new WebSocket(wsUrl);
      const ws2 = new WebSocket(wsUrl);

      const messagePromise = new Promise<void>((resolve, reject) => {
        ws2.on('message', data => {
          try {
            const message = JSON.parse(data.toString());
            expect(message.type).toBe('message');
            expect(message.content).toBe('Hello!');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      await new Promise<void>(resolve => ws1.on('open', resolve));
      await new Promise<void>(resolve => ws2.on('open', resolve));

      ws1.send(JSON.stringify({
        type: 'message',
        content: 'Hello!',
        threadId: uuidv4(),
        recipientId: mockUserId
      }));

      await messagePromise;
    });

    it('should enforce rate limits', async () => {
      const ws = new WebSocket(wsUrl);
      await new Promise<void>(resolve => ws.on('open', resolve));

      const sendMessages = async (count: number) => {
        for (let i = 0; i < count; i++) {
          ws.send(JSON.stringify({
            type: 'message',
            content: `Message ${i}`,
            threadId: uuidv4(),
            recipientId: mockUserId
          }));
        }
      };

      // Send messages up to rate limit
      await sendMessages(10);

      // Try to send one more
      const errorPromise = new Promise<void>((resolve, reject) => {
        ws.on('message', data => {
          try {
            const response = JSON.parse(data.toString());
            expect(response.type).toBe('error');
            expect(response.error).toContain('rate limit');
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      ws.send(JSON.stringify({
        type: 'message',
        content: 'Over limit',
        threadId: uuidv4(),
        recipientId: mockUserId
      }));

      await errorPromise;
    });
  });

  describe('Thread Operations', () => {
    it('should handle concurrent thread updates', async () => {
      const ws1 = new WebSocket(wsUrl);
      const ws2 = new WebSocket(wsUrl);
      const threadId = uuidv4();

      await Promise.all([
        new Promise<void>(resolve => ws1.on('open', resolve)),
        new Promise<void>(resolve => ws2.on('open', resolve))
      ]);

      // Both clients try to update the thread simultaneously
      const update1Promise = new Promise<void>((resolve, reject) => {
        ws1.on('message', data => {
          try {
            const response = JSON.parse(data.toString());
            expect(response.type).toBe('threadUpdate');
            expect(response.success).toBe(true);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      const update2Promise = new Promise<void>((resolve, reject) => {
        ws2.on('message', data => {
          try {
            const response = JSON.parse(data.toString());
            expect(response.type).toBe('threadUpdate');
            expect(response.success).toBe(true);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      ws1.send(JSON.stringify({
        type: 'threadUpdate',
        threadId,
        data: { title: 'Update 1' }
      }));

      ws2.send(JSON.stringify({
        type: 'threadUpdate',
        threadId,
        data: { title: 'Update 2' }
      }));

      await Promise.all([update1Promise, update2Promise]);

      // Verify final state
      const thread = await threadManager.getThread(threadId);
      expect(thread.title).toBe('Update 2'); // Last write wins
    });
  });

  describe('Error Recovery', () => {
    it('should handle and recover from errors', async () => {
      const ws = new WebSocket(wsUrl);
      await new Promise<void>(resolve => ws.on('open', resolve));

      // Mock an error in thread manager
      const mockError = new Error('Simulated error');
      vi.spyOn(threadManager, 'updateThread').mockRejectedValueOnce(mockError);

      // Set up error recovery handler
      const recoveryPromise = new Promise<void>((resolve, reject) => {
        errorRecovery.on('taskEnqueued', task => {
          try {
            expect(task.type).toBe('threadUpdate');
            expect(task.error).toBe(mockError.message);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      ws.send(JSON.stringify({
        type: 'threadUpdate',
        threadId: uuidv4(),
        data: { title: 'Test' }
      }));

      await recoveryPromise;
    });

    it('should retry failed operations', async () => {
      const ws = new WebSocket(wsUrl);
      await new Promise<void>(resolve => ws.on('open', resolve));

      let attempts = 0;
      const mockError = new Error('Temporary error');
      
      vi.spyOn(threadManager, 'updateThread')
        .mockImplementation(async () => {
          attempts++;
          if (attempts < 3) {
            throw mockError;
          }
        });

      const successPromise = new Promise<void>((resolve, reject) => {
        ws.on('message', data => {
          try {
            const response = JSON.parse(data.toString());
            if (response.type === 'threadUpdate' && response.success) {
              expect(attempts).toBe(3);
              resolve();
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      ws.send(JSON.stringify({
        type: 'threadUpdate',
        threadId: uuidv4(),
        data: { title: 'Test' }
      }));

      await successPromise;
    });
  });

  describe('End-to-End Encryption', () => {
    it('should encrypt and decrypt direct messages', async () => {
      const ws1 = new WebSocket(wsUrl);
      const ws2 = new WebSocket(wsUrl);
      const user1Id = uuidv4();
      const user2Id = uuidv4();

      await Promise.all([
        e2ee.initializeUser(user1Id),
        e2ee.initializeUser(user2Id),
        new Promise<void>(resolve => ws1.on('open', resolve)),
        new Promise<void>(resolve => ws2.on('open', resolve))
      ]);

      const originalMessage = 'Secret message';
      
      const messagePromise = new Promise<void>((resolve, reject) => {
        ws2.on('message', async data => {
          try {
            const message = JSON.parse(data.toString());
            expect(message.type).toBe('directMessage');
            
            const decrypted = await e2ee.decryptMessage(
              user2Id,
              user1Id,
              message.encrypted
            );
            
            expect(decrypted).toBe(originalMessage);
            resolve();
          } catch (error) {
            reject(error);
          }
        });
      });

      const encrypted = await e2ee.encryptMessage(
        user1Id,
        user2Id,
        originalMessage
      );

      ws1.send(JSON.stringify({
        type: 'directMessage',
        recipientId: user2Id,
        encrypted
      }));

      await messagePromise;
    });

    it('should handle key rotation', async () => {
      const user1Id = uuidv4();
      const user2Id = uuidv4();

      await Promise.all([
        e2ee.initializeUser(user1Id),
        e2ee.initializeUser(user2Id)
      ]);

      const message = 'Test message';
      
      // Encrypt with original keys
      const encrypted1 = await e2ee.encryptMessage(user1Id, user2Id, message);
      const decrypted1 = await e2ee.decryptMessage(user2Id, user1Id, encrypted1);
      expect(decrypted1).toBe(message);

      // Rotate keys
      await e2ee.rotateKeys();

      // Encrypt with new keys
      const encrypted2 = await e2ee.encryptMessage(user1Id, user2Id, message);
      const decrypted2 = await e2ee.decryptMessage(user2Id, user1Id, encrypted2);
      expect(decrypted2).toBe(message);

      // Verify key health
      expect(await e2ee.verifyKeyHealth()).toBe(true);
    });
  });

  describe('WebSocket Rate Limiting', () => {
    let ws: WebSocket;
    
    beforeEach(async () => {
      ws = new WebSocket(wsUrl);
      await new Promise<void>(resolve => ws.on('open', resolve));
    });

    afterEach(() => {
      ws.close();
    });

    it('should enforce message rate limits', async () => {
      const messages = Array.from({ length: 65 }, (_, i) => ({
        type: 'message:send',
        content: `Message ${i}`,
        threadId: uuidv4(),
        recipientId: mockUserId
      }));

      let rateLimitHit = false;
      const messagePromises = messages.map(msg => 
        new Promise<void>(resolve => {
          ws.send(JSON.stringify(msg));
          ws.once('message', data => {
            const response = JSON.parse(data.toString());
            if (response.error?.code === 'RATE_LIMIT_EXCEEDED') {
              rateLimitHit = true;
            }
            resolve();
          });
        })
      );

      await Promise.all(messagePromises);
      expect(rateLimitHit).toBe(true);
    });

    it('should enforce typing update rate limits', async () => {
      const updates = Array.from({ length: 25 }, (_, i) => ({
        type: 'typing:update',
        threadId: uuidv4(),
        isTyping: true
      }));

      let rateLimitHit = false;
      const updatePromises = updates.map(update => 
        new Promise<void>(resolve => {
          ws.send(JSON.stringify(update));
          ws.once('message', data => {
            const response = JSON.parse(data.toString());
            if (response.error?.code === 'RATE_LIMIT_EXCEEDED') {
              rateLimitHit = true;
            }
            resolve();
          });
        })
      );

      await Promise.all(updatePromises);
      expect(rateLimitHit).toBe(true);
    });

    it('should enforce reaction rate limits', async () => {
      const reactions = Array.from({ length: 35 }, (_, i) => ({
        type: 'reaction:add',
        messageId: uuidv4(),
        reaction: '👍'
      }));

      let rateLimitHit = false;
      const reactionPromises = reactions.map(reaction => 
        new Promise<void>(resolve => {
          ws.send(JSON.stringify(reaction));
          ws.once('message', data => {
            const response = JSON.parse(data.toString());
            if (response.error?.code === 'RATE_LIMIT_EXCEEDED') {
              rateLimitHit = true;
            }
            resolve();
          });
        })
      );

      await Promise.all(reactionPromises);
      expect(rateLimitHit).toBe(true);
    });

    it('should reset rate limits after window expires', async () => {
      // Send messages up to limit
      const messages = Array.from({ length: 60 }, (_, i) => ({
        type: 'message:send',
        content: `Message ${i}`,
        threadId: uuidv4(),
        recipientId: mockUserId
      }));

      for (const msg of messages) {
        ws.send(JSON.stringify(msg));
        await new Promise(resolve => setTimeout(resolve, 50)); // Space out messages
      }

      // Wait for rate limit window to expire
      await new Promise(resolve => setTimeout(resolve, 60000));

      // Should be able to send messages again
      const newMessage = {
        type: 'message:send',
        content: 'New message after window',
        threadId: uuidv4(),
        recipientId: mockUserId
      };

      const response = await new Promise<any>(resolve => {
        ws.send(JSON.stringify(newMessage));
        ws.once('message', data => {
          resolve(JSON.parse(data.toString()));
        });
      });

      expect(response.error?.code).not.toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should handle rate limit errors gracefully', async () => {
      // Mock Redis failure
      const originalCheckLimit = wsRateLimiter.checkLimit;
      wsRateLimiter.checkLimit = async () => {
        throw new Error('Redis connection failed');
      };

      const message = {
        type: 'message:send',
        content: 'Test message',
        threadId: uuidv4(),
        recipientId: mockUserId
      };

      const response = await new Promise<any>(resolve => {
        ws.send(JSON.stringify(message));
        ws.once('message', data => {
          resolve(JSON.parse(data.toString()));
        });
      });

      // Should fail open with conservative limit
      expect(response.error?.code).not.toBe('RATE_LIMIT_EXCEEDED');

      // Restore original implementation
      wsRateLimiter.checkLimit = originalCheckLimit;
    });
  });
}); 