import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { auth } from '@clerk/nextjs';
import { GET, PUT } from '../../app/api/users/me/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { SystemRole } from '@prisma/client';
import { createMocks } from 'node-mocks-http';

jest.mock('@clerk/nextjs');
jest.mock('@/lib/prisma');

describe('User Profile API', () => {
  const mockUser = {
    id: 'test_user_id',
    email: 'test@example.com',
    name: 'Test User',
    systemRole: SystemRole.USER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
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

  describe('GET /api/users/me', () => {
    it('should return current user profile when authenticated', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

      const request = new NextRequest(
        new Request('http://localhost/api/users/me')
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockUser);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id }
      });
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const request = new NextRequest(
        new Request('http://localhost/api/users/me')
      );

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should return 404 when user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const request = new NextRequest(
        new Request('http://localhost/api/users/me')
      );

      const response = await GET(request);
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/users/me', () => {
    it('should update user profile when authenticated', async () => {
      const updates = {
        name: 'Updated Name',
        isActive: false
      };

      const updatedUser = {
        ...mockUser,
        ...updates,
        updatedAt: new Date()
      };

      (prisma.user.update as jest.Mock).mockResolvedValueOnce(updatedUser);

      const request = new NextRequest(
        new Request('http://localhost/api/users/me', {
          method: 'PUT',
          body: JSON.stringify(updates)
        })
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedUser);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: updates
      });
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const request = new NextRequest(
        new Request('http://localhost/api/users/me', {
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' })
        })
      );

      const response = await PUT(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 when request body is invalid', async () => {
      const request = new NextRequest(
        new Request('http://localhost/api/users/me', {
          method: 'PUT',
          body: 'invalid json'
        })
      );

      const response = await PUT(request);
      expect(response.status).toBe(400);
    });

    it('should return 400 when trying to update restricted fields', async () => {
      const request = new NextRequest(
        new Request('http://localhost/api/users/me', {
          method: 'PUT',
          body: JSON.stringify({
            systemRole: SystemRole.ADMIN,
            email: 'new@example.com'
          })
        })
      );

      const response = await PUT(request);
      expect(response.status).toBe(400);
    });
  });
});

describe('User API', () => {
  let testUser: any;
  let testThread: any;

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        clerkId: 'test-clerk-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    });

    // Mock Clerk auth to return test user
    (auth as jest.MockedFunction<typeof auth>).mockResolvedValue({
      userId: testUser.clerkId,
      sessionId: 'test-session',
      session: null,
      actor: null,
      organization: null,
      debug: null,
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  describe('GET /api/users/[userId]', () => {
    it('should return unauthorized for unauthenticated requests', async () => {
      (auth as jest.MockedFunction<typeof auth>).mockResolvedValueOnce({
        userId: null,
        sessionId: null,
        session: null,
        actor: null,
        organization: null,
        debug: null,
      });

      const { req, res } = createMocks({
        method: 'GET',
        params: { userId: testUser.id },
      });

      await GET(req, { params: { userId: testUser.id } });
      expect(res._getStatusCode()).toBe(401);
    });

    it('should return user profile for authenticated user', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        params: { userId: testUser.id },
      });

      await GET(req, { params: { userId: testUser.id } });
      expect(res._getStatusCode()).toBe(200);

      const data = JSON.parse(res._getData());
      expect(data.id).toBe(testUser.id);
      expect(data.email).toBe(testUser.email);
      expect(data.name).toBe(testUser.name);
    });

    it('should include user threads when requested', async () => {
      // Create a thread with the test user
      testThread = await prisma.thread.create({
        data: {
          name: 'Test Thread',
          participants: {
            create: {
              userId: testUser.id,
              role: 'OWNER',
            },
          },
        },
      });

      const { req, res } = createMocks({
        method: 'GET',
        params: { userId: testUser.id },
        query: { include: 'threads' },
      });

      await GET(req, { params: { userId: testUser.id } });
      expect(res._getStatusCode()).toBe(200);

      const data = JSON.parse(res._getData());
      expect(data.threads).toBeDefined();
      expect(data.threads.length).toBe(1);
      expect(data.threads[0].id).toBe(testThread.id);

      // Clean up thread
      await prisma.threadParticipant.deleteMany({
        where: { threadId: testThread.id },
      });
      await prisma.thread.delete({
        where: { id: testThread.id },
      });
    });
  });

  describe('PUT /api/users/[userId]', () => {
    it('should update user profile', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        params: { userId: testUser.id },
        body: {
          name: 'Updated Name',
        },
      });

      await PUT(req, { params: { userId: testUser.id } });
      expect(res._getStatusCode()).toBe(200);

      const data = JSON.parse(res._getData());
      expect(data.name).toBe('Updated Name');

      // Verify database update
      const updatedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(updatedUser?.name).toBe('Updated Name');
    });

    it('should prevent updating other users profiles', async () => {
      // Create another user
      const otherUser = await prisma.user.create({
        data: {
          clerkId: 'other-clerk-id',
          email: 'other@example.com',
          name: 'Other User',
        },
      });

      const { req, res } = createMocks({
        method: 'PUT',
        params: { userId: otherUser.id },
        body: {
          name: 'Hacked Name',
        },
      });

      await PUT(req, { params: { userId: otherUser.id } });
      expect(res._getStatusCode()).toBe(403);

      // Verify database not updated
      const unchangedUser = await prisma.user.findUnique({
        where: { id: otherUser.id },
      });
      expect(unchangedUser?.name).toBe('Other User');

      // Clean up
      await prisma.user.delete({
        where: { id: otherUser.id },
      });
    });

    it('should validate user data', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        params: { userId: testUser.id },
        body: {
          email: 'invalid-email', // Invalid email should fail validation
        },
      });

      await PUT(req, { params: { userId: testUser.id } });
      expect(res._getStatusCode()).toBe(400);

      // Verify database not updated
      const unchangedUser = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      expect(unchangedUser?.email).toBe(testUser.email);
    });
  });
}); 