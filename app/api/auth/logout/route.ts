import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';

export async function POST() {
  const { userId } = auth();
  
  if (!userId) {
    return new NextResponse(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 }
    );
  }

  return new NextResponse(
    JSON.stringify({ success: true }),
    { status: 200 }
  );
} 