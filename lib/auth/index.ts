import { PrismaClient } from '@prisma/client';
import { redisClient } from '../redis';
import { auth } from '@clerk/nextjs';

const prisma = new PrismaClient();

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export async function validateAuth(): Promise<AuthTokenPayload> {
  const { userId } = auth();
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const user = await prisma.user.findUnique({ 
    where: { clerkId: userId },
    select: { id: true, email: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return {
    userId: user.id,
    email: user.email
  };
}

export async function createUser(clerkId: string, email: string, name: string): Promise<any> {
  const user = await prisma.user.create({
    data: {
      clerkId,
      email,
      name,
    },
  });

  return user;
}

export async function getUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function updateUserProfile(userId: string, data: { name?: string; image?: string }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      createdAt: true,
      updatedAt: true
    }
  });
}

export async function deleteUser(userId: string): Promise<void> {
  await prisma.user.delete({
    where: { id: userId }
  });
}

// Redis-based session management for additional features
export async function storeUserSession(userId: string, sessionData: any): Promise<void> {
  await redisClient.set(`session:${userId}`, JSON.stringify(sessionData), {
    EX: 86400 // 24 hours
  });
}

export async function getUserSession(userId: string): Promise<any> {
  const session = await redisClient.get(`session:${userId}`);
  return session ? JSON.parse(session) : null;
}

export async function removeUserSession(userId: string): Promise<void> {
  await redisClient.del(`session:${userId}`);
} 