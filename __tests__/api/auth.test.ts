import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { auth } from '@clerk/nextjs';
import { GET } from '@/app/api/users/me/route';

jest.mock('@clerk/nextjs');

describe('Authentication API', () => {
  beforeAll(() => {
    // Mock Clerk auth
    (auth as jest.Mock).mockImplementation(() => ({
      userId: 'test_user_id',
      sessionId: 'test_session_id',
    }));
  });

  afterAll(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/users/me', () => {
    it('should return current user when authenticated', async () => {
      const { req, res } = createMocks({
        method: 'GET',
      });

      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email');
      expect(data).toHaveProperty('username');
    });

    it('should return 401 when not authenticated', async () => {
      (auth as jest.Mock).mockImplementationOnce(() => null);

      const { req, res } = createMocks({
        method: 'GET',
      });

      const response = await GET(req);
      expect(response.status).toBe(401);
    });
  });
}); 