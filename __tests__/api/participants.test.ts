import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { auth } from '@clerk/nextjs';
import { POST, DELETE, PUT } from '../../app/api/threads/[threadId]/participants/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ThreadRole } from '@prisma/client';

jest.mock('@clerk/nextjs');
jest.mock('@/lib/prisma');

describe('Thread Participants API', () => {
  const mockUser = {
    id: 'test_user_id',
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockThreadId = 'test_thread_id';

  beforeAll(() => {
    (auth as jest.Mock).mockImplementation(() => ({
      userId: mockUser.id,
      sessionId: 'test_session_id',
    }));
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/threads/[threadId]/participants', () => {
    it('should add participant when authenticated and authorized', async () => {
      const participant = {
        userId: 'new_user_id',
        role: ThreadRole.MEMBER
      };

      const mockParticipant = {
        userId: participant.userId,
        threadId: mockThreadId,
        role: participant.role,
        joinedAt: new Date(),
        user: {
          id: participant.userId,
          name: 'New User',
          email: 'new@example.com'
        }
      };

      // Mock current user as thread owner
      (prisma.threadParticipant.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: mockUser.id,
        role: ThreadRole.OWNER
      });

      (prisma.threadParticipant.create as jest.Mock).mockResolvedValueOnce(mockParticipant);

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/participants`, {
          method: 'POST',
          body: JSON.stringify(participant)
        })
      );

      const response = await POST(request, { params: { threadId: mockThreadId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockParticipant);
      expect(prisma.threadParticipant.create).toHaveBeenCalledWith({
        data: {
          userId: participant.userId,
          threadId: mockThreadId,
          role: participant.role
        },
        include: {
          user: true
        }
      });
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/participants`, {
          method: 'POST',
          body: JSON.stringify({ userId: 'new_user_id', role: ThreadRole.MEMBER })
        })
      );

      const response = await POST(request, { params: { threadId: mockThreadId } });
      expect(response.status).toBe(401);
    });

    it('should return 403 when not authorized', async () => {
      // Mock current user as regular member
      (prisma.threadParticipant.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: mockUser.id,
        role: ThreadRole.MEMBER
      });

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/participants`, {
          method: 'POST',
          body: JSON.stringify({ userId: 'new_user_id', role: ThreadRole.MEMBER })
        })
      );

      const response = await POST(request, { params: { threadId: mockThreadId } });
      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/threads/[threadId]/participants/[userId]', () => {
    const targetUserId = 'target_user_id';

    it('should update participant role when authenticated and authorized', async () => {
      const update = {
        role: ThreadRole.ADMIN
      };

      const mockParticipant = {
        userId: targetUserId,
        threadId: mockThreadId,
        role: update.role,
        joinedAt: new Date(),
        user: {
          id: targetUserId,
          name: 'Target User',
          email: 'target@example.com'
        }
      };

      // Mock current user as thread owner
      (prisma.threadParticipant.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: mockUser.id,
        role: ThreadRole.OWNER
      });

      (prisma.threadParticipant.update as jest.Mock).mockResolvedValueOnce(mockParticipant);

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/participants/${targetUserId}`, {
          method: 'PUT',
          body: JSON.stringify(update)
        })
      );

      const response = await PUT(request, { params: { threadId: mockThreadId, userId: targetUserId } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockParticipant);
      expect(prisma.threadParticipant.update).toHaveBeenCalledWith({
        where: {
          userId_threadId: {
            userId: targetUserId,
            threadId: mockThreadId
          }
        },
        data: update,
        include: {
          user: true
        }
      });
    });

    it('should return 403 when trying to update owner role', async () => {
      // Mock target user as owner
      (prisma.threadParticipant.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          userId: mockUser.id,
          role: ThreadRole.ADMIN
        })
        .mockResolvedValueOnce({
          userId: targetUserId,
          role: ThreadRole.OWNER
        });

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/participants/${targetUserId}`, {
          method: 'PUT',
          body: JSON.stringify({ role: ThreadRole.MEMBER })
        })
      );

      const response = await PUT(request, { params: { threadId: mockThreadId, userId: targetUserId } });
      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/threads/[threadId]/participants/[userId]', () => {
    const targetUserId = 'target_user_id';

    it('should remove participant when authenticated and authorized', async () => {
      // Mock current user as thread owner
      (prisma.threadParticipant.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: mockUser.id,
        role: ThreadRole.OWNER
      });

      (prisma.threadParticipant.delete as jest.Mock).mockResolvedValueOnce({
        userId: targetUserId,
        threadId: mockThreadId
      });

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/participants/${targetUserId}`, {
          method: 'DELETE'
        })
      );

      const response = await DELETE(request, { params: { threadId: mockThreadId, userId: targetUserId } });
      expect(response.status).toBe(204);
      expect(prisma.threadParticipant.delete).toHaveBeenCalledWith({
        where: {
          userId_threadId: {
            userId: targetUserId,
            threadId: mockThreadId
          }
        }
      });
    });

    it('should return 403 when trying to remove owner', async () => {
      // Mock target user as owner
      (prisma.threadParticipant.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          userId: mockUser.id,
          role: ThreadRole.ADMIN
        })
        .mockResolvedValueOnce({
          userId: targetUserId,
          role: ThreadRole.OWNER
        });

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/participants/${targetUserId}`, {
          method: 'DELETE'
        })
      );

      const response = await DELETE(request, { params: { threadId: mockThreadId, userId: targetUserId } });
      expect(response.status).toBe(403);
    });

    it('should return 403 when not authorized', async () => {
      // Mock current user as regular member
      (prisma.threadParticipant.findFirst as jest.Mock).mockResolvedValueOnce({
        userId: mockUser.id,
        role: ThreadRole.MEMBER
      });

      const request = new NextRequest(
        new Request(`http://localhost/api/threads/${mockThreadId}/participants/${targetUserId}`, {
          method: 'DELETE'
        })
      );

      const response = await DELETE(request, { params: { threadId: mockThreadId, userId: targetUserId } });
      expect(response.status).toBe(403);
    });
  });
}); 