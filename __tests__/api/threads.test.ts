import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { auth } from '@clerk/nextjs';
import { GET, POST } from '@/app/api/threads/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

jest.mock('@clerk/nextjs');
jest.mock('@/lib/prisma');

describe('Threads API', () => {
  const mockUser = {
    id: 'test_user_id',
    email: 'test@example.com',
    username: 'testuser'
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

  describe('GET /api/threads', () => {
    it('should return user threads when authenticated', async () => {
      const mockThreads = [
        { id: 1, title: 'Thread 1' },
        { id: 2, title: 'Thread 2' }
      ];

      (prisma.thread.findMany as jest.Mock).mockResolvedValueOnce(mockThreads);

      const { req } = createMocks({
        method: 'GET'
      });

      const request = new NextRequest(new Request('http://localhost/api/threads'));
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockThreads);
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const request = new NextRequest(new Request('http://localhost/api/threads'));
      const response = await GET(request);
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/threads', () => {
    it('should create a new thread when authenticated', async () => {
      const newThread = {
        title: 'New Thread'
      };

      const mockCreatedThread = {
        id: 1,
        ...newThread,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.thread.create as jest.Mock).mockResolvedValueOnce(mockCreatedThread);

      const request = new NextRequest(
        new Request('http://localhost/api/threads', {
          method: 'POST',
          body: JSON.stringify(newThread)
        })
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockCreatedThread);
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const request = new NextRequest(
        new Request('http://localhost/api/threads', {
          method: 'POST',
          body: JSON.stringify({ title: 'New Thread' })
        })
      );

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('should return 400 when title is missing', async () => {
      const request = new NextRequest(
        new Request('http://localhost/api/threads', {
          method: 'POST',
          body: JSON.stringify({})
        })
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
}); 