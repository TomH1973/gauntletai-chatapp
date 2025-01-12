import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { auth } from '@clerk/nextjs';
import { POST, DELETE } from '../../app/api/messages/[messageId]/reactions/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';

jest.mock('@clerk/nextjs');
jest.mock('@/lib/prisma');

describe('Message Reactions API', () => {
  const mockUser = {
    id: 'test_user_id',
    email: 'test@example.com',
    name: 'Test User'
  };

  const mockMessageId = 'test_message_id';

  beforeAll(() => {
    (auth as jest.Mock).mockImplementation(() => ({
      userId: mockUser.id,
      sessionId: 'test_session_id',
    }));
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('POST /api/messages/[messageId]/reactions', () => {
    it('should add reaction when authenticated', async () => {
      const reaction = {
        emoji: '👍'
      };

      const mockReaction = {
        messageId: mockMessageId,
        userId: mockUser.id,
        emoji: reaction.emoji,
        createdAt: new Date()
      };

      (prisma.messageReaction.create as jest.Mock).mockResolvedValueOnce(mockReaction);

      const request = new NextRequest(
        new Request(`http://localhost/api/messages/${mockMessageId}/reactions`, {
          method: 'POST',
          body: JSON.stringify(reaction)
        })
      );

      const response = await POST(request, { params: { messageId: mockMessageId } });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockReaction);
      expect(prisma.messageReaction.create).toHaveBeenCalledWith({
        data: {
          messageId: mockMessageId,
          userId: mockUser.id,
          emoji: reaction.emoji
        }
      });
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const request = new NextRequest(
        new Request(`http://localhost/api/messages/${mockMessageId}/reactions`, {
          method: 'POST',
          body: JSON.stringify({ emoji: '👍' })
        })
      );

      const response = await POST(request, { params: { messageId: mockMessageId } });
      expect(response.status).toBe(401);
    });

    it('should return 400 when emoji is missing', async () => {
      const request = new NextRequest(
        new Request(`http://localhost/api/messages/${mockMessageId}/reactions`, {
          method: 'POST',
          body: JSON.stringify({})
        })
      );

      const response = await POST(request, { params: { messageId: mockMessageId } });
      expect(response.status).toBe(400);
    });

    it('should return 404 when message does not exist', async () => {
      (prisma.message.findUnique as jest.Mock).mockResolvedValueOnce(null);

      const request = new NextRequest(
        new Request(`http://localhost/api/messages/${mockMessageId}/reactions`, {
          method: 'POST',
          body: JSON.stringify({ emoji: '👍' })
        })
      );

      const response = await POST(request, { params: { messageId: mockMessageId } });
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/messages/[messageId]/reactions', () => {
    it('should remove reaction when authenticated', async () => {
      const reaction = {
        emoji: '👍'
      };

      (prisma.messageReaction.delete as jest.Mock).mockResolvedValueOnce({
        messageId: mockMessageId,
        userId: mockUser.id,
        emoji: reaction.emoji
      });

      const request = new NextRequest(
        new Request(`http://localhost/api/messages/${mockMessageId}/reactions`, {
          method: 'DELETE',
          body: JSON.stringify(reaction)
        })
      );

      const response = await DELETE(request, { params: { messageId: mockMessageId } });
      expect(response.status).toBe(204);
      expect(prisma.messageReaction.delete).toHaveBeenCalledWith({
        where: {
          messageId_userId_emoji: {
            messageId: mockMessageId,
            userId: mockUser.id,
            emoji: reaction.emoji
          }
        }
      });
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const request = new NextRequest(
        new Request(`http://localhost/api/messages/${mockMessageId}/reactions`, {
          method: 'DELETE',
          body: JSON.stringify({ emoji: '👍' })
        })
      );

      const response = await DELETE(request, { params: { messageId: mockMessageId } });
      expect(response.status).toBe(401);
    });

    it('should return 400 when emoji is missing', async () => {
      const request = new NextRequest(
        new Request(`http://localhost/api/messages/${mockMessageId}/reactions`, {
          method: 'DELETE',
          body: JSON.stringify({})
        })
      );

      const response = await DELETE(request, { params: { messageId: mockMessageId } });
      expect(response.status).toBe(400);
    });

    it('should return 404 when reaction does not exist', async () => {
      (prisma.messageReaction.delete as jest.Mock).mockRejectedValueOnce(new Error('Not found'));

      const request = new NextRequest(
        new Request(`http://localhost/api/messages/${mockMessageId}/reactions`, {
          method: 'DELETE',
          body: JSON.stringify({ emoji: '👍' })
        })
      );

      const response = await DELETE(request, { params: { messageId: mockMessageId } });
      expect(response.status).toBe(404);
    });
  });
}); 