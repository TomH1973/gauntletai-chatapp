import { describe, expect, it } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { validateMessage } from '@/lib/validation/message';
import { sanitizeHtml } from '@/lib/sanitization';

describe('Input Validation & Sanitization', () => {
  describe('Message Content Validation', () => {
    it('should reject XSS attempts', async () => {
      const maliciousContent = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(\'xss\')">',
        '<svg onload="alert(\'xss\')">',
        '<a href="javascript:alert(\'xss\')">click me</a>'
      ];

      for (const content of maliciousContent) {
        const { req, res } = createMocks({
          method: 'POST',
          url: '/api/threads/1/messages',
          body: { content },
        });

        const response = await fetch(req);
        expect(response.status).toBe(400);
      }
    });

    it('should sanitize HTML in messages', () => {
      const inputs = [
        {
          input: '<p>Hello <script>alert("xss")</script>World</p>',
          expected: '<p>Hello World</p>'
        },
        {
          input: '<a href="javascript:alert(\'xss\')">click me</a>',
          expected: '<a>click me</a>'
        },
        {
          input: '<img src="x" onerror="alert(\'xss\')" />',
          expected: '<img src="x" />'
        }
      ];

      for (const { input, expected } of inputs) {
        const sanitized = sanitizeHtml(input);
        expect(sanitized).toBe(expected);
      }
    });

    it('should validate message length limits', async () => {
      const tooLongMessage = 'a'.repeat(5001); // Assuming 5000 char limit
      
      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/threads/1/messages',
        body: { content: tooLongMessage },
      });

      const response = await fetch(req);
      expect(response.status).toBe(400);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in query params', async () => {
      const maliciousIds = [
        "1; DROP TABLE users",
        "1' OR '1'='1",
        "1 UNION SELECT * FROM users",
      ];

      for (const id of maliciousIds) {
        const { req, res } = createMocks({
          method: 'GET',
          url: `/api/threads/${id}`,
        });

        const response = await fetch(req);
        expect(response.status).toBe(400);
      }
    });

    it('should prevent SQL injection in JSON body', async () => {
      const maliciousData = {
        name: "Thread 1'; DROP TABLE users; --",
      };

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/threads',
        body: maliciousData,
      });

      const response = await fetch(req);
      expect(response.status).toBe(400);
    });
  });

  describe('File Upload Validation', () => {
    it('should validate file types', async () => {
      const invalidFiles = [
        { name: 'malicious.exe', type: 'application/x-msdownload' },
        { name: 'script.js', type: 'application/javascript' },
        { name: 'fake.jpg.php', type: 'application/x-php' },
      ];

      for (const file of invalidFiles) {
        const formData = new FormData();
        formData.append('file', new Blob(['test']), file.name);

        const { req, res } = createMocks({
          method: 'POST',
          url: '/api/upload',
          body: formData,
        });

        const response = await fetch(req);
        expect(response.status).toBe(400);
      }
    });

    it('should validate file size limits', async () => {
      const largeFile = new Blob([new ArrayBuffer(11 * 1024 * 1024)]); // 11MB
      const formData = new FormData();
      formData.append('file', largeFile, 'large.jpg');

      const { req, res } = createMocks({
        method: 'POST',
        url: '/api/upload',
        body: formData,
      });

      const response = await fetch(req);
      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on message sending', async () => {
      const requests = Array(11).fill(null).map(() => 
        createMocks({
          method: 'POST',
          url: '/api/threads/1/messages',
          body: { content: 'Test message' },
        })
      );

      const responses = await Promise.all(
        requests.map(({ req }) => fetch(req))
      );

      // Last request should be rate limited
      expect(responses[10].status).toBe(429);
    });

    it('should enforce rate limits on authentication attempts', async () => {
      const requests = Array(6).fill(null).map(() =>
        createMocks({
          method: 'POST',
          url: '/api/auth/signin',
          body: {
            email: 'test@example.com',
            password: 'wrongpassword',
          },
        })
      );

      const responses = await Promise.all(
        requests.map(({ req }) => fetch(req))
      );

      // Last request should be rate limited
      expect(responses[5].status).toBe(429);
    });
  });
}); 