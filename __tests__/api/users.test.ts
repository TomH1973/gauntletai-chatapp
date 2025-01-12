import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { auth } from '@clerk/nextjs';
import { GET, PUT } from '../../app/api/users/me/route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
import { SystemRole } from '@prisma/client';

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