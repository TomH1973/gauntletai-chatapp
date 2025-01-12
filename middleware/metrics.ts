import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { metrics } from '@/app/api/metrics/route';

export async function middleware(request: NextRequest) {
  const start = performance.now();
  
  // Get the response
  const response = await NextResponse.next();
  
  // Calculate duration and update metrics
  const duration = performance.now() - start;
  metrics.httpRequestDuration.set(
    { 
      method: request.method, 
      route: request.nextUrl.pathname,
      status_code: response.status.toString()
    }, 
    duration / 1000
  );

  return response;
}

export const config = {
  matcher: '/api/:path*'
}; 