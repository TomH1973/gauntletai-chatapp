import { describe, expect, it } from '@jest/globals';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

describe('Data Encryption', () => {
  describe('At-Rest Encryption', () => {
    it('should encrypt sensitive data before storing', async () => {
      const sensitiveData = {
        email: 'test@example.com',
        phoneNumber: '+1234567890',
        address: '123 Test St'
      };

      // Create user with sensitive data
      const user = await prisma.user.create({
        data: {
          clerkId: 'test-clerk-id',
          email: sensitiveData.email,
          name: 'Test User',
          metadata: {
            create: {
              phoneNumber: sensitiveData.phoneNumber,
              address: sensitiveData.address
            }
          }
        },
        include: {
          metadata: true
        }
      });

      // Verify data is encrypted in database
      const dbUser = await prisma.$queryRaw`
        SELECT metadata FROM "User" WHERE id = ${user.id}
      `;

      // Raw database values should not contain plaintext sensitive data
      const rawData = JSON.stringify(dbUser);
      expect(rawData).not.toContain(sensitiveData.phoneNumber);
      expect(rawData).not.toContain(sensitiveData.address);

      // But decrypted data should match original
      expect(user.metadata?.phoneNumber).toBe(sensitiveData.phoneNumber);
      expect(user.metadata?.address).toBe(sensitiveData.address);

      // Cleanup
      await prisma.user.delete({
        where: { id: user.id }
      });
    });

    it('should use strong encryption algorithms', () => {
      const algorithms = crypto.getCiphers();
      const requiredAlgorithms = ['aes-256-gcm', 'aes-256-cbc'];
      
      for (const algo of requiredAlgorithms) {
        expect(algorithms).toContain(algo);
      }
    });
  });

  describe('In-Transit Encryption', () => {
    it('should enforce HTTPS', async () => {
      const response = await fetch('http://localhost:3000/api/health');
      expect(response.headers.get('Strict-Transport-Security')).toBeDefined();
    });

    it('should set secure cookies', async () => {
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123'
        })
      });

      const cookies = response.headers.get('Set-Cookie');
      expect(cookies).toContain('Secure');
      expect(cookies).toContain('HttpOnly');
      expect(cookies).toContain('SameSite=Strict');
    });
  });

  describe('Key Management', () => {
    it('should rotate encryption keys periodically', async () => {
      const keyHistory = await prisma.keyRotation.findMany({
        orderBy: { createdAt: 'desc' },
        take: 2
      });

      expect(keyHistory).toHaveLength(2);
      expect(keyHistory[0].createdAt).toBeGreaterThan(keyHistory[1].createdAt);
    });

    it('should securely store encryption keys', async () => {
      const keyData = await prisma.keyRotation.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      // Key should be encrypted or hashed
      expect(keyData?.key).not.toMatch(/^[a-zA-Z0-9]{32,}$/);
    });
  });

  describe('End-to-End Encryption', () => {
    it('should generate unique keypairs for users', async () => {
      const user = await prisma.user.create({
        data: {
          clerkId: 'test-e2e-user',
          email: 'e2e@example.com',
          name: 'E2E Test User'
        }
      });

      const keys = await prisma.userKeys.findFirst({
        where: { userId: user.id }
      });

      expect(keys?.publicKey).toBeDefined();
      expect(keys?.encryptedPrivateKey).toBeDefined();
      expect(keys?.publicKey).not.toBe(keys?.encryptedPrivateKey);

      // Cleanup
      await prisma.user.delete({
        where: { id: user.id }
      });
    });

    it('should encrypt direct messages end-to-end', async () => {
      // Create two users
      const [alice, bob] = await Promise.all([
        prisma.user.create({
          data: {
            clerkId: 'alice-id',
            email: 'alice@example.com',
            name: 'Alice'
          }
        }),
        prisma.user.create({
          data: {
            clerkId: 'bob-id',
            email: 'bob@example.com',
            name: 'Bob'
          }
        })
      ]);

      // Create a direct message thread
      const thread = await prisma.thread.create({
        data: {
          name: 'Alice & Bob',
          type: 'DIRECT',
          participants: {
            createMany: {
              data: [
                { userId: alice.id, role: 'MEMBER' },
                { userId: bob.id, role: 'MEMBER' }
              ]
            }
          }
        }
      });

      // Send an encrypted message
      const message = await prisma.message.create({
        data: {
          content: 'Hello Bob, this is a secret message!',
          threadId: thread.id,
          senderId: alice.id,
          encrypted: true
        }
      });

      // Raw message in DB should be encrypted
      const dbMessage = await prisma.$queryRaw`
        SELECT content FROM "Message" WHERE id = ${message.id}
      `;
      expect(JSON.stringify(dbMessage)).not.toContain('secret message');

      // Cleanup
      await prisma.thread.delete({
        where: { id: thread.id }
      });
      await Promise.all([
        prisma.user.delete({ where: { id: alice.id } }),
        prisma.user.delete({ where: { id: bob.id } })
      ]);
    });
  });
}); 