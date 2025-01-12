import { Counter, Gauge, Histogram } from 'prom-client'
import logger from '../logger'

export class SecurityMonitoring {
  private static authAttempts = new Counter({
    name: 'auth_attempts_total',
    help: 'Total number of authentication attempts',
    labelNames: ['success', 'provider']
  })

  private static activeUsers = new Gauge({
    name: 'active_users',
    help: 'Number of currently active users'
  })

  private static requestDuration = new Histogram({
    name: 'auth_request_duration_seconds',
    help: 'Authentication request duration in seconds',
    buckets: [0.1, 0.5, 1, 2, 5]
  })

  private static rateLimitHits = new Counter({
    name: 'rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['endpoint']
  })

  private static missingHeaders = new Counter({
    name: 'missing_security_headers_total',
    help: 'Total number of requests with missing security headers',
    labelNames: ['header']
  })

  static trackAuthAttempt(success: boolean, provider: string) {
    this.authAttempts.inc({ success: success.toString(), provider })
    logger.info('Auth attempt tracked', { success, provider })
  }

  static trackActiveUsers(count: number) {
    this.activeUsers.set(count)
  }

  static trackAuthenticatedRequest(path: string, failed: boolean, duration: number) {
    this.requestDuration.observe(duration)
    logger.info('Auth request tracked', { path, failed, duration })
  }

  static trackRateLimit(endpoint: string) {
    this.rateLimitHits.inc({ endpoint })
    logger.warn('Rate limit hit', { endpoint })
  }

  static trackMissingHeader(header: string) {
    this.missingHeaders.inc({ header })
    logger.warn('Missing security header', { header })
  }

  static trackSecurityEvent(type: string, details: Record<string, any>) {
    logger.warn('Security event detected', { type, ...details })
  }
} 