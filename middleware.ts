import { NextResponse } from 'next/server'
import { authMiddleware } from '@clerk/nextjs'
import helmet from 'helmet'
import { ApiError, ApiResponse } from './lib/api'
import { SecurityMonitoring } from './lib/monitoring/security'

// Configure CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}

// Configure security headers using Helmet
const securityHeaders = {
  ...helmet.contentSecurityPolicy.getDefaultDirectives(),
  'Cross-Origin-Opener-Policy': 'same-origin',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
}

export default authMiddleware({
  beforeAuth: async (req) => {
    const startTime = Date.now()

    // Check security headers
    const requiredHeaders = [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy'
    ]
    
    requiredHeaders.forEach(header => {
      if (!req.headers.get(header)) {
        SecurityMonitoring.trackMissingHeader(header)
      }
    })

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return NextResponse.json({}, { headers: corsHeaders })
    }

    const response = NextResponse.next()

    // Apply CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    // Apply security headers
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })

    // Track request duration
    const duration = (Date.now() - startTime) / 1000
    SecurityMonitoring.trackAuthenticatedRequest(req.nextUrl.pathname, false, duration)

    return response
  },
  afterAuth: async (auth, req) => {
    const startTime = Date.now()

    try {
      // Track authentication
      SecurityMonitoring.trackAuthAttempt(!!auth.userId, 'clerk')

      // Handle WebSocket upgrade requests
      if (req.nextUrl.pathname === '/api/socket' && req.method === 'GET') {
        if (!auth.userId) {
          SecurityMonitoring.trackSuspiciousActivity('unauthorized_websocket', 'medium')
          return ApiResponse.error(ApiError.Unauthorized, 401)
        }
        const response = NextResponse.next()
        response.headers.set('x-user-id', auth.userId)
        return response
      }

      // Rate limiting check (if implemented)
      if (auth.userId && req.url.includes('/api/')) {
        SecurityMonitoring.trackRateLimit(req.nextUrl.pathname, auth.userId)
      }

      // Track authenticated request duration
      const duration = (Date.now() - startTime) / 1000
      SecurityMonitoring.trackAuthenticatedRequest(
        req.nextUrl.pathname,
        !!auth.userId,
        duration
      )

      return NextResponse.next()
    } catch (error) {
      console.error('Middleware Error:', error)
      SecurityMonitoring.trackSuspiciousActivity('middleware_error', 'high')
      return ApiResponse.error(ApiError.ServerError, 500)
    }
  },
  publicRoutes: ['/api/socket'],
})

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/",
    "/(api|trpc)(.*)",
    "/api/socket"
  ]
}; 