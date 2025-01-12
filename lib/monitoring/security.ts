import { Counter, Histogram } from 'prom-client'
import logger from '../logger'
import register from '../metrics'

// Authentication Metrics
export const authAttemptCounter = new Counter({
  name: 'auth_attempts_total',
  help: 'Total number of authentication attempts',
  labelNames: ['status', 'provider'],
  registers: [register]
})

// Rate Limiting Metrics
export const rateLimitCounter = new Counter({
  name: 'rate_limit_hits_total',
  help: 'Total number of rate limit hits',
  labelNames: ['endpoint', 'user_id'],
  registers: [register]
})

// Security Headers Metrics
export const missingHeaderCounter = new Counter({
  name: 'missing_security_headers_total',
  help: 'Total number of requests with missing security headers',
  labelNames: ['header'],
  registers: [register]
})

// Suspicious Activity Metrics
export const suspiciousActivityCounter = new Counter({
  name: 'suspicious_activity_total',
  help: 'Total number of suspicious activities detected',
  labelNames: ['type', 'severity'],
  registers: [register]
})

// Request Duration by Authentication Status
export const authRequestDuration = new Histogram({
  name: 'authenticated_request_duration_seconds',
  help: 'Duration of authenticated requests',
  labelNames: ['endpoint', 'auth_status'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register]
})

// Security Event Logger
export const logSecurityEvent = (
  eventType: string,
  severity: 'info' | 'warn' | 'error',
  details: Record<string, any>
) => {
  logger[severity](`Security Event: ${eventType}`, {
    ...details,
    timestamp: new Date().toISOString(),
    eventType
  })
}

// Security Monitoring Interface
export const SecurityMonitoring = {
  // Authentication monitoring
  trackAuthAttempt: (success: boolean, provider: string) => {
    const status = success ? 'success' : 'failure'
    authAttemptCounter.inc({ status, provider })
    logSecurityEvent('auth_attempt', success ? 'info' : 'warn', { success, provider })
  },

  // Rate limiting monitoring
  trackRateLimit: (endpoint: string, userId: string) => {
    rateLimitCounter.inc({ endpoint, user_id: userId })
    logSecurityEvent('rate_limit', 'warn', { endpoint, userId })
  },

  // Security headers monitoring
  trackMissingHeader: (header: string) => {
    missingHeaderCounter.inc({ header })
    logSecurityEvent('missing_header', 'warn', { header })
  },

  // Suspicious activity monitoring
  trackSuspiciousActivity: (type: string, severity: 'low' | 'medium' | 'high') => {
    suspiciousActivityCounter.inc({ type, severity })
    logSecurityEvent('suspicious_activity', 'warn', { type, severity })
  },

  // Request tracking
  trackAuthenticatedRequest: (endpoint: string, isAuthenticated: boolean, duration: number) => {
    const authStatus = isAuthenticated ? 'authenticated' : 'unauthenticated'
    authRequestDuration.observe({ endpoint, auth_status: authStatus }, duration)
  }
} 