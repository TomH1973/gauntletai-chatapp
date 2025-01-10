import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { ThreadRoleManager } from '@/lib/auth/threadRoles';
import { NextResponse } from 'next/server';

const roleUpdateSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER'])
});

export async function GET(
  req: Request,
  { params }: { params: { threadId: string; userId: string } }
) {
  const { userId: actorId } = auth();
  if (!actorId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    // Verify actor has permission to view roles
    await ThreadRoleManager.validateThreadAction(actorId, params.threadId, 'thread:update');
    
    const role = await ThreadRoleManager.getThreadRole(params.userId, params.threadId);
    if (!role) {
      return new NextResponse('Participant not found', { status: 404 });
    }

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Failed to get participant role:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { threadId: string; userId: string } }
) {
  const { userId: actorId } = auth();
  if (!actorId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const { role } = roleUpdateSchema.parse(body);

    await ThreadRoleManager.setThreadRole(
      params.threadId,
      params.userId,
      role,
      actorId
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    console.error('Failed to update participant role:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 