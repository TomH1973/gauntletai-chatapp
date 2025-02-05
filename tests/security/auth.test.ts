import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import jwt from 'jsonwebtoken';

jest.mock('@clerk/nextjs');

describe('Authentication Security', () => {
  const mockUser = {
    id: 'test_user_id',
    email: 'test@example.com',
    name: 'Test User'
  };

  beforeAll(() => {
    (auth as jest.Mock).mockImplementation(() => ({
      userId: mockUser.id,
      sessionId: 'test_session_id',
    }));
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('Token Security', () => {
    it('should reject expired tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: mockUser.id },
        process.env.JWT_SECRET || 'test-secret',
        { expiresIn: '0s' }
      );

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      });

      const response = await fetch(req);
      expect(response.status).toBe(401);
    });

    it('should reject tampered tokens', async () => {
      const validToken = jwt.sign(
        { userId: mockUser.id },
        process.env.JWT_SECRET || 'test-secret'
      );
      
      const tamperedToken = validToken.slice(0, -5) + 'xxxxx';

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tamperedToken}`,
        },
      });

      const response = await fetch(req);
      expect(response.status).toBe(401);
    });

    it('should reject tokens from logged out sessions', async () => {
      // Create and then invalidate a session
      const token = jwt.sign(
        { userId: mockUser.id },
        process.env.JWT_SECRET || 'test-secret'
      );

      await prisma.session.create({
        data: {
          token,
          userId: mockUser.id,
          invalidated: true,
        },
      });

      const { req, res } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const response = await fetch(req);
      expect(response.status).toBe(401);
    });
  });

  describe('Authorization Checks', () => {
    it('should prevent accessing other users data', async () => {
      const otherUser = await prisma.user.create({
        data: {
          clerkId: 'other-user-id',
          email: 'other@example.com',
          name: 'Other User',
        },
      });

      const { req, res } = createMocks({
        method: 'GET',
        url: `/api/users/${otherUser.id}/profile`,
      });

      const response = await fetch(req);
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
    });

    it('should prevent unauthorized thread access', async () => {
      // Create a thread without the test user
      const thread = await prisma.thread.create({
        data: {
          name: 'Private Thread',
          participants: {
            create: {
              userId: 'some-other-user-id',
              role: 'OWNER',
            },
          },
        },
      });

      const { req, res } = createMocks({
        method: 'GET',
        url: `/api/threads/${thread.id}`,
      });

      const response = await fetch(req);
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.thread.delete({
        where: { id: thread.id },
      });
    });

    it('should enforce role-based permissions', async () => {
      const thread = await prisma.thread.create({
        data: {
          name: 'Test Thread',
          participants: {
            create: {
              userId: mockUser.id,
              role: 'MEMBER', // Not an admin/owner
            },
          },
        },
      });

      // Try to perform admin-only actions
      const { req, res } = createMocks({
        method: 'DELETE',
        url: `/api/threads/${thread.id}`,
      });

      const response = await fetch(req);
      expect(response.status).toBe(403);

      // Cleanup
      await prisma.thread.delete({
        where: { id: thread.id },
      });
    });
  });

  describe('Session Management', () => {
    it('should handle concurrent sessions correctly', async () => {
      // Create multiple valid sessions
      const sessions = await Promise.all([
        prisma.session.create({
          data: {
            userId: mockUser.id,
            token: 'token1',
          },
        }),
        prisma.session.create({
          data: {
            userId: mockUser.id,
            token: 'token2',
          },
        }),
      ]);

      // Verify all sessions are valid
      for (const session of sessions) {
        const { req, res } = createMocks({
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.token}`,
          },
        });

        const response = await fetch(req);
        expect(response.status).toBe(200);
      }

      // Logout from one session
      await prisma.session.update({
        where: { id: sessions[0].id },
        data: { invalidated: true },
      });

      // Verify first session is invalid but second remains valid
      const { req: req1 } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessions[0].token}`,
        },
      });
      const response1 = await fetch(req1);
      expect(response1.status).toBe(401);

      const { req: req2 } = createMocks({
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessions[1].token}`,
        },
      });
      const response2 = await fetch(req2);
      expect(response2.status).toBe(200);

      // Cleanup
      await prisma.session.deleteMany({
        where: {
          id: {
            in: sessions.map(s => s.id),
          },
        },
      });
    });
  });
}); 