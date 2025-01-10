import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ResourceIsolation } from '@/lib/auth/resourceIsolation';

// Define routes that require resource isolation
const ISOLATED_RESOURCES = {
  '/api/users/:userId': 'user',
  '/api/threads/:threadId': 'thread',
  '/api/messages/:messageId': 'message',
  '/api/attachments/:attachmentId': 'attachment'
} as const;

export async function resourceIsolation(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const path = request.nextUrl.pathname;

  // Check if route requires isolation
  const routeMatch = Object.entries(ISOLATED_RESOURCES).find(([route]) => {
    const pattern = route.replace(/:\w+/g, '[^/]+');
    return new RegExp(`^${pattern}`).test(path);
  });

  if (!routeMatch) {
    return NextResponse.next();
  }

  try {
    const [route, resourceType] = routeMatch;
    const resourceId = path.split('/')[3]; // Extract resource ID from path

    await ResourceIsolation.enforceAccess(
      resourceType,
      resourceId,
      userId
    );

    return NextResponse.next();
  } catch (error) {
    console.error('Resource isolation middleware error:', error);
    return new NextResponse('Forbidden', { status: 403 });
  }
}

export const config = {
  matcher: [
    '/api/users/:userId/:path*',
    '/api/threads/:threadId/:path*',
    '/api/messages/:messageId/:path*',
    '/api/attachments/:attachmentId/:path*'
  ]
}; 