import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const isEdgeRuntime = typeof process.env.NEXT_RUNTIME === 'string' && process.env.NEXT_RUNTIME === 'edge'

export async function middleware(request: NextRequest) {
  // Skip metrics endpoint in Edge runtime
  if (isEdgeRuntime && request.nextUrl.pathname === '/api/metrics') {
    return NextResponse.json(
      { error: 'Metrics endpoint is not available in Edge runtime' },
      { status: 404 }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/metrics',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
} 