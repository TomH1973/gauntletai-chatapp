import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    
    return NextResponse.json({
      message: 'Test endpoint',
      authenticated: !!userId,
      userId
    });
  } catch (error: any) {
    return NextResponse.json({
      message: 'Error in test endpoint',
      error: error?.message || 'Unknown error'
    }, { status: 500 });
  }
} 