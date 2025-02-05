import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { auth, useClerk } from '@clerk/nextjs';
import { GET, POST } from '../../app/api/threads/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { ParticipantRole } from '@prisma/client';
import { createMocks } from 'node-mocks-http';
import { GET as MessageGET, POST as MessagePOST } from '@/app/api/threads/[threadId]/messages/route';
import { useSessionManager } from '@/lib/auth/session';
import { metrics } from '@/lib/metrics';

jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(),
  useClerk: jest.fn()
}));
jest.mock('@/lib/prisma');
jest.mock('@/lib/auth/session');
jest.mock('@/lib/metrics');

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

describe('Thread API', () => {
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

    // Create test thread
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
    await prisma.threadParticipant.deleteMany({
      where: { threadId: testThread.id },
    });
    await prisma.thread.delete({
      where: { id: testThread.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  describe('GET /api/threads/[threadId]/messages', () => {
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
        params: { threadId: testThread.id },
      });

      await MessageGET(req, { params: { threadId: testThread.id } });
      expect(res._getStatusCode()).toBe(401);
    });

    it('should return messages for authenticated thread participant', async () => {
      const message = await prisma.message.create({
        data: {
          content: 'Test message',
          userId: testUser.id,
          threadId: testThread.id,
        },
      });

      const { req, res } = createMocks({
        method: 'GET',
        params: { threadId: testThread.id },
      });

      await MessageGET(req, { params: { threadId: testThread.id } });
      expect(res._getStatusCode()).toBe(200);

      const data = JSON.parse(res._getData());
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].id).toBe(message.id);
    });

    it('should return threaded messages correctly', async () => {
      const parentMessage = await prisma.message.create({
        data: {
          content: 'Parent message',
          userId: testUser.id,
          threadId: testThread.id,
        },
      });

      const replyMessage = await prisma.message.create({
        data: {
          content: 'Reply message',
          userId: testUser.id,
          threadId: testThread.id,
          parentId: parentMessage.id,
        },
      });

      const { req, res } = createMocks({
        method: 'GET',
        params: { threadId: testThread.id },
      });

      await MessageGET(req, { params: { threadId: testThread.id } });
      expect(res._getStatusCode()).toBe(200);

      const data = JSON.parse(res._getData());
      const parent = data.find((m: any) => m.id === parentMessage.id);
      expect(parent).toBeDefined();
      expect(parent.replies).toBeDefined();
      expect(parent.replies[0].id).toBe(replyMessage.id);
    });
  });

  describe('POST /api/threads/[threadId]/messages', () => {
    it('should create a new message in the thread', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        params: { threadId: testThread.id },
        body: {
          content: 'New test message',
        },
      });

      await MessagePOST(req, { params: { threadId: testThread.id } });
      expect(res._getStatusCode()).toBe(201);

      const data = JSON.parse(res._getData());
      expect(data.content).toBe('New test message');
      expect(data.threadId).toBe(testThread.id);
      expect(data.userId).toBe(testUser.id);
    });

    it('should create a threaded reply', async () => {
      const parentMessage = await prisma.message.create({
        data: {
          content: 'Parent message',
          userId: testUser.id,
          threadId: testThread.id,
        },
      });

      const { req, res } = createMocks({
        method: 'POST',
        params: { threadId: testThread.id },
        body: {
          content: 'Reply message',
          parentId: parentMessage.id,
        },
      });

      await MessagePOST(req, { params: { threadId: testThread.id } });
      expect(res._getStatusCode()).toBe(201);

      const data = JSON.parse(res._getData());
      expect(data.content).toBe('Reply message');
      expect(data.parentId).toBe(parentMessage.id);
    });

    it('should validate message content', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        params: { threadId: testThread.id },
        body: {
          content: '', // Empty content should fail validation
        },
      });

      await MessagePOST(req, { params: { threadId: testThread.id } });
      expect(res._getStatusCode()).toBe(400);
    });
  });
});

describe('Token Refresh', () => {
  const mockUser = {
    id: 'test_user_id',
    email: 'test@example.com'
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

  it('should refresh token before expiry', async () => {
    const mockSession = {
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 10), // 10 minutes ago
      expireAt: new Date(Date.now() + 1000 * 60 * 5), // expires in 5 minutes
      reload: jest.fn().mockResolvedValue(undefined)
    };

    (useClerk as jest.Mock).mockReturnValue({
      session: mockSession
    });

    const sessionManager = useSessionManager();

    // Setup token refresh
    await sessionManager.setupTokenRefresh();

    // Fast-forward time by 4 minutes
    jest.advanceTimersByTime(1000 * 60 * 4);

    // Token should be refreshed
    expect(mockSession.reload).toHaveBeenCalled();
    expect(metrics.tokenRefreshSuccess.inc).toHaveBeenCalled();
  });

  it('should handle refresh errors gracefully', async () => {
    const mockSession = {
      lastActiveAt: new Date(Date.now() - 1000 * 60 * 10),
      expireAt: new Date(Date.now() + 1000 * 60 * 5),
      reload: jest.fn().mockRejectedValue(new Error('Network error'))
    };

    (useClerk as jest.Mock).mockReturnValue({
      session: mockSession
    });

    const sessionManager = useSessionManager();

    // Setup token refresh
    await sessionManager.setupTokenRefresh();

    // Fast-forward time
    jest.advanceTimersByTime(1000 * 60 * 4);

    // Error should be logged and metrics updated
    expect(metrics.tokenRefreshErrors.inc).toHaveBeenCalled();
    expect(console.error).toHaveBeenCalledWith(
      'Token refresh failed:',
      expect.any(Error)
    );
  });

  it('should maintain session activity tracking', () => {
    const sessionManager = useSessionManager();
    
    // Update activity
    sessionManager.updateActivity();
    expect(sessionManager.isExpired()).toBe(false);

    // Fast-forward past inactivity timeout
    jest.advanceTimersByTime(1000 * 60 * 60 * 25); // 25 hours
    
    expect(sessionManager.isExpired()).toBe(true);
  });
}); 