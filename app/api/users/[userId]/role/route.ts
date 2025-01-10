import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { SystemRoleManager } from '@/lib/auth/systemRoles';
import { NextResponse } from 'next/server';

const roleUpdateSchema = z.object({
  role: z.enum(['ADMIN', 'MODERATOR', 'USER', 'GUEST'])
});

export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const role = await SystemRoleManager.getUserRole(params.userId);
    return NextResponse.json({ role });
  } catch (error) {
    console.error('Failed to get user role:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  const { userId } = auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const body = await req.json();
    const { role } = roleUpdateSchema.parse(body);

    // Verify the actor has permission to change roles
    const actorRole = await SystemRoleManager.getUserRole(userId);
    if (actorRole !== 'ADMIN') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    await SystemRoleManager.setUserRole(params.userId, role, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ errors: error.errors }, { status: 400 });
    }
    console.error('Failed to update user role:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 