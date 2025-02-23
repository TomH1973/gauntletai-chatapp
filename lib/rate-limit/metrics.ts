import { Counter, Histogram } from 'prom-client';
import { RateLimitEvent, RateLimitEventType } from './events';
import { RateLimiter } from './limiter';

// Define metrics
const rateLimitAttempts = new Counter({
  name: 'rate_limit_attempts_total',
  help: 'Total number of rate limit checks',
  labelNames: ['action']
});

const rateLimitBlocks = new Counter({
  name: 'rate_limit_blocks_total',
  help: 'Total number of blocked requests',
  labelNames: ['action']
});

const rateLimitDuration = new Histogram({
  name: 'rate_limit_check_duration_seconds',
  help: 'Duration of rate limit checks',
  labelNames: ['action', 'result'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1]
});

const rateLimitRemaining = new Histogram({
  name: 'rate_limit_remaining_points',
  help: 'Remaining points for rate limited actions',
  labelNames: ['action'],
  buckets: [0, 5, 10, 25, 50, 100]
});

const rateLimitErrors = new Counter({
  name: 'rate_limit_errors_total',
  help: 'Total number of rate limit errors',
  labelNames: ['action', 'error_type']
});

export class RateLimitMetricsAdapter {
  constructor(private limiter: RateLimiter) {
    // Subscribe to batched events
    this.limiter.onBatch(this.handleEvents.bind(this));
  }

  private handleEvents(events: RateLimitEvent[]): void {
    events.forEach(event => {
      switch (event.type) {
        case 'ATTEMPT':
          rateLimitAttempts.inc({ action: event.action });
          break;

        case 'BLOCKED':
          rateLimitBlocks.inc({ action: event.action });
          if (event.metadata?.retryAfter) {
            rateLimitDuration.observe(
              { action: event.action, result: 'blocked' },
              event.metadata.retryAfter
            );
          }
          break;

        case 'ALLOWED':
          if (event.metadata?.remaining !== undefined) {
            rateLimitRemaining.observe(
              { action: event.action },
              event.metadata.remaining
            );
          }
          break;

        case 'ERROR':
          rateLimitErrors.inc({
            action: event.action,
            error_type: event.metadata?.error || 'unknown'
          });
          break;
      }
    });
  }

  // Export metrics for external use
  static metrics = {
    rateLimitAttempts,
    rateLimitBlocks,
    rateLimitDuration,
    rateLimitRemaining,
    rateLimitErrors
  };
} 