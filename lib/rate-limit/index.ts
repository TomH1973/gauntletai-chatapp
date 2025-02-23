import { RateLimiter } from './limiter';
import { RateLimitMetricsAdapter } from './metrics';
export * from './events';

// Create singleton instances
const rateLimiter = new RateLimiter(process.env.REDIS_URL);
const metricsAdapter = new RateLimitMetricsAdapter(rateLimiter);

// Get metrics from the static property
const metrics = RateLimitMetricsAdapter.metrics;

// Export the rate limiter instance and metrics
export {
  rateLimiter as rateLimit,
  metrics as rateLimitMetrics
}; 