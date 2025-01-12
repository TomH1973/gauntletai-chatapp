import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { auth } from '@clerk/nextjs';
import { GET, POST } from '../../app/api/threads/[threadId]/messages/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

jest.mock('@clerk/nextjs');
jest.mock('@/lib/prisma');

describe('Messages API', () => {
  const mockUser = {
    id: 'test_user_id',
    email: 'test@example.com',
    username: 'testuser'
  };

  const mockThreadId = '123';

  beforeAll(() => {
    (auth as jest.Mock).mockImplementation(() => ({
      userId: mockUser.id,
      sessionId: 'test_session_id',
    }));
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/threads/[threadId]/messages', () => {
    it('should return thread messages when authenticated', async () => {
      const mockMessages = [
        { id: 1, content: 'Message 1', userId: mockUser.id },
        { id: 2, content: 'Message 2', userId: mockUser.id }
      ];

      (prisma.message.findMany as jest.Mock).mockResolvedValueOnce(mockMessages);

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/messages`)
      );

      const response = await GET(request, { params: { threadId: mockThreadId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockMessages);
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/messages`)
      );

      const response = await GET(request, { params: { threadId: mockThreadId } });
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/threads/[threadId]/messages', () => {
    it('should create a new message when authenticated', async () => {
      const newMessage = {
        content: 'New message'
      };

      const mockCreatedMessage = {
        id: 1,
        ...newMessage,
        userId: mockUser.id,
        threadId: mockThreadId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      (prisma.message.create as jest.Mock).mockResolvedValueOnce(mockCreatedMessage);

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/messages`, {
          method: 'POST',
          body: JSON.stringify(newMessage)
        })
      );

      const response = await POST(request, { params: { threadId: mockThreadId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockCreatedMessage);
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/messages`, {
          method: 'POST',
          body: JSON.stringify({ content: 'New message' })
        })
      );

      const response = await POST(request, { params: { threadId: mockThreadId } });
      expect(response.status).toBe(401);
    });

    it('should return 400 when content is missing', async () => {
      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/messages`, {
          method: 'POST',
          body: JSON.stringify({})
        })
      );

      const response = await POST(request, { params: { threadId: mockThreadId } });
      expect(response.status).toBe(400);
    });
  });
}); 