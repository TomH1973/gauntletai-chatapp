import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, createSession, getSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { email, username, password } = await request.json();

    // Validate input
    if (!email || !username || !password) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return new NextResponse(
        'User with this email or username already exists',
        { status: 409 }
      );
    }

    // Create user
    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        profileImage: true,
      },
    });

    // Create session
    const token = await createSession(user.id);

    // Create response with cookie
    const response = NextResponse.json({ user });
    response.cookies.set(getSessionCookie(token));

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 