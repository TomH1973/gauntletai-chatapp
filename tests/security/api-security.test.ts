import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { sanitizeHtml } from '@/lib/sanitization';

interface MockUser {
  id: string;
  email: string;
  name: string;
  clerkId: string;
}

describe('API Endpoint Security', () => {
  let mockUser: MockUser;
  let validToken: string;

  beforeAll(async () => {
    // Create test user
    mockUser = await prisma.user.create({
      data: {
        clerkId: 'test-clerk-id',
        email: 'test@example.com',
        name: 'Test User'
      }
    });

    // Mock Clerk auth
    (auth as jest.Mock).mockImplementation(() => ({
      userId: mockUser.clerkId,
      sessionId: 'test_session_id',
    }));
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.delete({
      where: { id: mockUser.id }
    });
    jest.resetAllMocks();
  });

  describe('CSRF Protection', () => {
    it('should reject requests without CSRF token', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/threads',
        body: {
          name: 'Test Thread'
        }
      });

      await fetch(req.url as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(req.body)
      });

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'CSRF token missing');
    });

    it('should reject requests with invalid CSRF token', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/threads',
        headers: {
          'X-CSRF-Token': 'invalid-token'
        },
        body: {
          name: 'Test Thread'
        }
      });

      await fetch(req.url as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': 'invalid-token'
        },
        body: JSON.stringify(req.body)
      });

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Invalid CSRF token');
    });
  });

  describe('Request Validation', () => {
    it('should validate request body size', async () => {
      const largeBody = { data: 'x'.repeat(1024 * 1024 * 10) }; // 10MB
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/messages',
        body: largeBody
      });

      await fetch(req.url as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(largeBody)
      });

      expect(res._getStatusCode()).toBe(413);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Request entity too large');
    });

    it('should validate content type', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/messages',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: 'Invalid content type'
      });

      await fetch(req.url as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain'
        },
        body: 'Invalid content type'
      });

      expect(res._getStatusCode()).toBe(415);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Unsupported media type');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML in request body', async () => {
      const maliciousBody = {
        content: '<script>alert("xss")</script>Hello'
      };

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/messages',
        body: maliciousBody
      });

      await fetch(req.url as string, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(maliciousBody)
      });

      const data = JSON.parse(res._getData());
      expect(data.content).toBe('Hello');
      expect(data.content).not.toContain('<script>');
    });

    it('should sanitize query parameters', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/messages',
        query: {
          search: '<script>alert("xss")</script>test'
        }
      });

      await fetch(`${req.url}?search=${encodeURIComponent(req.query.search as string)}`);

      const data = JSON.parse(res._getData());
      expect(data.query.search).toBe('test');
      expect(data.query.search).not.toContain('<script>');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const requests = Array(11).fill(null).map(() => 
        createMocks({
          method: 'POST',
          url: '/api/messages',
          body: { content: 'Test message' }
        })
      );

      const responses = await Promise.all(
        requests.map(({ req }) => 
          fetch(req.url as string, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(req.body)
          })
        )
      );

      // Last request should be rate limited
      const lastResponse = responses[responses.length - 1];
      expect(lastResponse.status).toBe(429);
      const data = await lastResponse.json();
      expect(data).toHaveProperty('error', 'Too many requests');
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/threads'
      });

      // Clear auth mock
      (auth as jest.Mock).mockImplementationOnce(() => null);

      await fetch(req.url as string);

      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Unauthorized');
    });

    it('should enforce role-based access control', async () => {
      const thread = await prisma.thread.create({
        data: {
          name: 'Test Thread',
          participants: {
            create: {
              userId: 'other-user-id',
              role: 'OWNER'
            }
          }
        }
      });

      const { req, res } = createMocks({
        method: 'DELETE',
        url: `/api/threads/${thread.id}`
      });

      await fetch(req.url as string, {
        method: 'DELETE'
      });

      expect(res._getStatusCode()).toBe(403);
      expect(JSON.parse(res._getData())).toHaveProperty('error', 'Forbidden');

      // Cleanup
      await prisma.thread.delete({
        where: { id: thread.id }
      });
    });
  });
}); 