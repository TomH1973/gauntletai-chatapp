import { NextResponse } from 'next/server';
import { deleteSession, SESSION_COOKIE } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;

    if (sessionToken) {
      await deleteSession(sessionToken);
    }

    // Create response and clear cookie
    const response = new NextResponse('Logged out successfully');
    response.cookies.set({
      name: SESSION_COOKIE,
      value: '',
      expires: new Date(0),
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 