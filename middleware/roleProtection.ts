import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { SystemRoleManager } from '@/lib/auth/systemRoles';
import { ThreadRoleManager } from '@/lib/auth/threadRoles';

// Define protected routes and their required permissions
const PROTECTED_ROUTES = {
  '/api/users/:userId/role': {
    GET: ['user:view'],
    PATCH: ['user:manage']
  },
  '/api/threads/:threadId/participants/:userId/role': {
    GET: ['thread:view'],
    PATCH: ['thread:manage']
  }
} as const;

export async function roleProtection(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const path = request.nextUrl.pathname;
  const method = request.method;

  // Check if route requires protection
  const routeMatch = Object.keys(PROTECTED_ROUTES).find(route => {
    const pattern = route.replace(/:\w+/g, '[^/]+');
    return new RegExp(`^${pattern}$`).test(path);
  });

  if (!routeMatch) {
    return NextResponse.next();
  }

  const requiredPermissions = PROTECTED_ROUTES[routeMatch][method as keyof typeof PROTECTED_ROUTES[typeof routeMatch]];
  if (!requiredPermissions) {
    return NextResponse.next();
  }

  try {
    // Check system-wide permissions first
    const systemRole = await SystemRoleManager.getUserRole(userId);
    if (systemRole === 'ADMIN') {
      return NextResponse.next();
    }

    // For thread-specific routes, check thread permissions
    if (path.includes('/threads/')) {
      const threadId = path.split('/')[3];
      const hasThreadPermission = await ThreadRoleManager.hasThreadPermission(
        userId,
        threadId,
        'thread:manage'
      );
      if (!hasThreadPermission) {
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    return NextResponse.next();
  } catch (error) {
    console.error('Role protection middleware error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export const config = {
  matcher: [
    '/api/users/:userId/role',
    '/api/threads/:threadId/participants/:userId/role'
  ]
}; 