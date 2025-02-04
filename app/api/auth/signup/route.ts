import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const { email, name } = await request.json();
    
    if (!email || !name) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }

    const user = await createUser(userId, email, name);

    return new NextResponse(
      JSON.stringify({ user }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Signup error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500 }
    );
  }
} 