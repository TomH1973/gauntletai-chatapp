import { hash, compare } from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { prisma } from './prisma';
import { cookies } from 'next/headers';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const SESSION_COOKIE = 'auth_session';
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

export async function createSession(userId: string): Promise<string> {
  const token = sign({ userId }, JWT_SECRET, { expiresIn: '30d' });
  const expiresAt = new Date(Date.now() + SESSION_DURATION);

  await prisma.session.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function validateSession(token: string) {
  try {
    const session = await prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }

    return session.user;
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
    
    if (!sessionToken) {
      return null;
    }

    return validateSession(sessionToken);
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}

export async function deleteSession(token: string) {
  try {
    await prisma.session.delete({
      where: { token },
    });
  } catch (error) {
    console.error('Delete session error:', error);
    throw error;
  }
}

export function getSessionCookie(token: string): ResponseCookie {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  };
}

export { SESSION_COOKIE }; 