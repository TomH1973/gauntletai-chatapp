import Redis from 'ioredis';
import { metrics } from './metrics';
import { logger } from './logger';

let redisClient: Redis | null = null;
let isRedisHealthy = true;
const MAX_RETRY_ATTEMPTS = 5;
const INITIAL_RETRY_DELAY = 100;
const MAX_RETRY_DELAY = 5000;

export function createRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const client = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times > MAX_RETRY_ATTEMPTS) {
        isRedisHealthy = false;
        metrics.redisHealth.set(0);
        return null; // Stop retrying
      }
      const delay = Math.min(times * INITIAL_RETRY_DELAY, MAX_RETRY_DELAY);
      logger.info(`Redis retry attempt ${times} with delay ${delay}ms`);
      return delay;
    },
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
    showFriendlyErrorStack: process.env.NODE_ENV !== 'production',
    enableAutoPipelining: true,
    connectionName: `ws_server_${process.pid}`
  });

  client.on('error', (error) => {
    logger.error('Redis error:', error);
    metrics.errors.inc({ type: 'redis' });
    isRedisHealthy = false;
    metrics.redisHealth.set(0);
  });

  client.on('connect', () => {
    logger.info('Redis connected');
    isRedisHealthy = true;
    metrics.redisHealth.set(1);
  });

  client.on('ready', () => {
    logger.info('Redis ready');
    isRedisHealthy = true;
    metrics.redisHealth.set(1);
  });

  client.on('reconnecting', () => {
    logger.info('Redis reconnecting');
    metrics.redisReconnects.inc();
  });

  client.on('end', () => {
    logger.info('Redis connection ended');
    isRedisHealthy = false;
    metrics.redisHealth.set(0);
  });

  redisClient = client;
  return client;
}

export function createDuplicateClient(): Redis {
  const options = redisClient?.options || {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
      if (times > MAX_RETRY_ATTEMPTS) return null;
      return Math.min(times * INITIAL_RETRY_DELAY, MAX_RETRY_DELAY);
    },
    maxRetriesPerRequest: 3,
    enableOfflineQueue: true,
    enableAutoPipelining: true
  };

  return new Redis(options);
}

export function getRedisHealth(): boolean {
  return isRedisHealthy;
}

export default redisClient; 