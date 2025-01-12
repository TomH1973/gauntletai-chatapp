import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { auth } from '@clerk/nextjs';
import { GET, POST } from '../../app/api/threads/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ParticipantRole } from '@prisma/client';

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
        {
          id: '1',
          title: 'Thread 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [
            {
              userId: mockUser.id,
              role: ParticipantRole.OWNER,
              user: mockUser
            }
          ]
        },
        {
          id: '2',
          title: 'Thread 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [
            {
              userId: mockUser.id,
              role: ParticipantRole.MEMBER,
              user: mockUser
            }
          ]
        }
      ];

      (prisma.thread.findMany as jest.Mock).mockResolvedValueOnce(mockThreads);

      const request = new NextRequest(
        new Request('http://localhost/api/threads')
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockThreads);
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const request = new NextRequest(
        new Request('http://localhost/api/threads')
      );

      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('should search threads by title and messages', async () => {
      const mockThreads = [
        {
          id: '1',
          title: 'Project Discussion',
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [
            {
              userId: mockUser.id,
              role: ParticipantRole.MEMBER,
              user: mockUser
            }
          ],
          messages: [
            {
              id: '1',
              content: 'Let\'s discuss the project timeline',
              userId: mockUser.id,
              threadId: '1',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        }
      ];

      const mockCount = 1;
      (prisma.thread.findMany as jest.Mock).mockResolvedValueOnce(mockThreads);
      (prisma.thread.count as jest.Mock).mockResolvedValueOnce(mockCount);

      const request = new NextRequest(
        new Request('http://localhost/api/threads?q=project&page=1&limit=10')
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.threads).toEqual(mockThreads);
      expect(data.totalResults).toBe(mockCount);
      expect(data.page).toBe(1);
      expect(data.totalPages).toBe(1);

      expect(prisma.thread.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          AND: [
            {
              participants: {
                some: {
                  userId: mockUser.id
                }
              }
            },
            {
              OR: [
                {
                  title: {
                    contains: 'project',
                    mode: 'insensitive'
                  }
                },
                {
                  messages: {
                    some: {
                      content: {
                        contains: 'project',
                        mode: 'insensitive'
                      }
                    }
                  }
                }
              ]
            }
          ]
        },
        skip: 0,
        take: 10,
        include: {
          participants: {
            include: {
              user: true
            }
          },
          messages: true
        }
      }));
    });

    it('should return all threads when no search query is provided', async () => {
      const mockThreads = [
        {
          id: '1',
          title: 'Project Discussion',
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [
            {
              userId: mockUser.id,
              role: ParticipantRole.MEMBER,
              user: mockUser
            }
          ],
          messages: [
            {
              id: '1',
              content: 'First message',
              userId: mockUser.id,
              threadId: '1',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          ]
        },
        {
          id: '2',
          title: 'General Chat',
          createdAt: new Date(),
          updatedAt: new Date(),
          participants: [
            {
              userId: mockUser.id,
              role: ParticipantRole.OWNER,
              user: mockUser
            }
          ],
          messages: []
        }
      ];

      const mockCount = 2;
      (prisma.thread.findMany as jest.Mock).mockResolvedValueOnce(mockThreads);
      (prisma.thread.count as jest.Mock).mockResolvedValueOnce(mockCount);

      const request = new NextRequest(
        new Request('http://localhost/api/threads?page=1&limit=10')
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.threads).toEqual(mockThreads);
      expect(data.totalResults).toBe(mockCount);
      expect(data.page).toBe(1);
      expect(data.totalPages).toBe(1);

      expect(prisma.thread.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          participants: {
            some: {
              userId: mockUser.id
            }
          }
        },
        skip: 0,
        take: 10,
        include: {
          participants: {
            include: {
              user: true
            }
          },
          messages: true
        }
      }));
    });
  });

  describe('POST /api/threads', () => {
    it('should create a new thread when authenticated', async () => {
      const newThread = {
        title: 'New Thread',
        participantIds: ['user1', 'user2']
      };

      const mockCreatedThread = {
        id: '1',
        title: newThread.title,
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [
          {
            userId: mockUser.id,
            role: ParticipantRole.OWNER,
            user: mockUser
          },
          {
            userId: 'user1',
            role: ParticipantRole.MEMBER,
            user: { id: 'user1', name: 'User 1' }
          },
          {
            userId: 'user2',
            role: ParticipantRole.MEMBER,
            user: { id: 'user2', name: 'User 2' }
          }
        ]
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
      expect(prisma.thread.create).toHaveBeenCalledWith({
        data: {
          title: newThread.title,
          participants: {
            create: [
              { userId: mockUser.id, role: ParticipantRole.OWNER },
              ...newThread.participantIds.map(id => ({
                userId: id,
                role: ParticipantRole.MEMBER
              }))
            ]
          }
        },
        include: {
          participants: {
            include: {
              user: true
            }
          }
        }
      });
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

    it('should return 400 when participantIds is missing', async () => {
      const request = new NextRequest(
        new Request('http://localhost/api/threads', {
          method: 'POST',
          body: JSON.stringify({ title: 'New Thread' })
        })
      );

      const response = await POST(request);
      expect(response.status).toBe(400);
    });
  });
}); 